-- Notifications: an in-app inbox per user, plus Web Push subscriptions so the
-- same notification reaches the phone. A daily job (the `daily-reminders`
-- edge function, run by pg_cron) creates them:
--   * meeting_reminder: the day before a meeting, to every kid who will see it
--     (the message is written per kid by AI when an API key is configured);
--   * visit_reminder: to a servant whose assigned kids weren't visited lately.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.services (id) on delete cascade,
  kind text not null check (kind in ('meeting_reminder', 'visit_reminder')),
  -- What it is about (a meeting id, or the reminder's day for visits); with
  -- the kind it makes a notification unique, so a rerun never repeats one.
  ref_key text not null,
  title text not null,
  body text not null,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_key)
);
create index notifications_inbox on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications: own read"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: own mark read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: own delete"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- One row per device (browser push endpoint). A device belongs to whoever is
-- signed in on it now, so saving re-assigns it.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: own read"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'invalid subscription' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

-- Removes a device; only its current owner can (signing out on a shared phone).
create function public.remove_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Targets for the daily job (service role only)
-- ---------------------------------------------------------------------------

-- Kids to remind about the meetings on p_day: every active kid of the service
-- for a service-wide meeting, the class's kids for a class meeting, minus
-- those already reminded about that meeting.
create function public.meeting_reminder_targets(p_day date)
returns table (
  meeting_id uuid, service_id uuid, service_name text, class_name text,
  meeting_date date, start_time time, topic text, details text, speaker_name text,
  served_id uuid, served_name text
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.service_id, s.name, c.name,
         m.meeting_date, m.start_time, m.topic, m.details, sp.full_name,
         sm.user_id, p.full_name
  from public.meetings m
  join public.services s on s.id = m.service_id
  left join public.classes c on c.id = m.class_id
  left join public.profiles sp on sp.id = m.speaker_id
  join public.service_members sm
    on sm.service_id = m.service_id and sm.role = 'served' and sm.status = 'active'
   and (m.class_id is null or sm.class_id = m.class_id)
  join public.profiles p on p.id = sm.user_id
  where m.meeting_date = p_day
    and not exists (
      select 1 from public.notifications n
      where n.user_id = sm.user_id and n.kind = 'meeting_reminder' and n.ref_key = m.id::text
    )
  order by m.id, p.full_name;
$$;

-- Servants with assigned kids nobody visited in p_days days (or ever), who
-- weren't reminded in that time. One row per servant and service.
create function public.visit_reminder_targets(p_days int default 7)
returns table (servant_id uuid, service_id uuid, service_name text, served_names text[])
language sql stable security definer set search_path = ''
as $$
  select sa.servant_id, sa.service_id, s.name,
         array_agg(p.full_name order by p.full_name)
  from public.servant_assignments sa
  join public.services s on s.id = sa.service_id
  join public.profiles p on p.id = sa.served_id
  where public.is_active_member(sa.servant_id, sa.service_id, 'servant')
    and public.is_active_member(sa.served_id, sa.service_id, 'served')
    and coalesce(
          (select max(v.visited_at) from public.visits v
            where v.service_id = sa.service_id and v.served_id = sa.served_id),
          '-infinity'::timestamptz
        ) < now() - make_interval(days => greatest(p_days, 1))
    and not exists (
      select 1 from public.notifications n
      where n.user_id = sa.servant_id and n.kind = 'visit_reminder'
        and n.service_id = sa.service_id
        and n.created_at > now() - make_interval(days => greatest(p_days, 1))
    )
  group by sa.servant_id, sa.service_id, s.name;
$$;

revoke execute on function
  public.save_push_subscription(text, text, text),
  public.remove_push_subscription(text),
  public.meeting_reminder_targets(date),
  public.visit_reminder_targets(int)
from anon, public, authenticated;
grant execute on function
  public.save_push_subscription(text, text, text),
  public.remove_push_subscription(text)
to authenticated;
grant execute on function
  public.meeting_reminder_targets(date),
  public.visit_reminder_targets(int)
to service_role;
