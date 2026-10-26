-- Phase 6: servant interface — visits (افتقاد), preparation check-in (تحضير).

create function public.cairo_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'Africa/Cairo')::date;
$$;

-- ---------------------------------------------------------------------------
-- Visits
-- ---------------------------------------------------------------------------
-- Assigned servant logs a visit/call/message. Points (rule "visit") are given
-- for at most one visit per kid per Cairo day, so logging twice doesn't pay.
create function public.log_visit(
  p_service uuid,
  p_served uuid,
  p_type public.visit_type,
  p_notes text default null,
  p_visited_at timestamptz default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_at timestamptz := coalesce(p_visited_at, now());
  v_day date := (coalesce(p_visited_at, now()) at time zone 'Africa/Cairo')::date;
  v_id uuid;
begin
  if not public.is_assigned_servant(p_served, p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_at > now() + interval '5 minutes' or v_at < now() - interval '30 days' then
    raise exception 'visit date out of range' using errcode = '22023';
  end if;

  insert into public.visits (service_id, servant_id, served_id, visit_type, visited_at, notes)
  values (p_service, v_uid, p_served, p_type, v_at, nullif(trim(p_notes), ''))
  returning id into v_id;

  if not exists (
    select 1 from public.visits v
    where v.service_id = p_service and v.servant_id = v_uid and v.served_id = p_served
      and v.id <> v_id
      and (v.visited_at at time zone 'Africa/Cairo')::date = v_day
  ) then
    perform public.ledger_add(p_service, v_uid, public.rule_points(p_service, 'visit'), 'visit', v_id);
  end if;
  return v_id;
end;
$$;

-- The caller's assigned kids with their last visit (servant screen).
create function public.my_assigned(p_service uuid)
returns table (
  served_id uuid, full_name text, avatar_url text, phone text,
  class_id uuid, class_name text, last_visit_at timestamptz, last_visit_type public.visit_type,
  visits_count int
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.has_service_role(p_service, 'servant') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select sa.served_id, p.full_name, p.avatar_url, p.phone, sm.class_id, c.name,
           lv.visited_at, lv.visit_type, coalesce(cnt.n, 0)
    from public.servant_assignments sa
    join public.profiles p on p.id = sa.served_id
    join public.service_members sm
      on sm.service_id = sa.service_id and sm.user_id = sa.served_id and sm.role = 'served'
    left join public.classes c on c.id = sm.class_id
    left join lateral (
      select v.visited_at, v.visit_type from public.visits v
      where v.service_id = sa.service_id and v.served_id = sa.served_id
      order by v.visited_at desc limit 1
    ) lv on true
    left join lateral (
      select count(*)::int as n from public.visits v
      where v.service_id = sa.service_id and v.served_id = sa.served_id and v.servant_id = sa.servant_id
    ) cnt on true
    where sa.service_id = p_service and sa.servant_id = (select auth.uid())
    order by lv.visited_at asc nulls first, p.full_name;
end;
$$;

-- Every active kid with their servant and last visit (admin screen).
create function public.visit_overview(p_service uuid)
returns table (
  served_id uuid, full_name text, class_id uuid,
  servant_id uuid, servant_name text, last_visit_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_service_admin(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select sm.user_id, p.full_name, sm.class_id, sa.servant_id, sp.full_name,
           (select max(v.visited_at) from public.visits v
             where v.service_id = p_service and v.served_id = sm.user_id)
    from public.service_members sm
    join public.profiles p on p.id = sm.user_id
    left join public.servant_assignments sa on sa.service_id = p_service and sa.served_id = sm.user_id
    left join public.profiles sp on sp.id = sa.servant_id
    where sm.service_id = p_service and sm.role = 'served' and sm.status = 'active'
    order by p.full_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Preparation sessions
-- ---------------------------------------------------------------------------
-- Servant checks in on the session's day (Cairo). Returns true if new.
create function public.check_in_prep(p_session uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.prep_sessions;
  v_id uuid;
begin
  select * into v_session from public.prep_sessions where id = p_session;
  if v_session.id is null or not public.has_service_role(v_session.service_id, 'servant') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_session.session_date <> public.cairo_today() then
    raise exception 'not_today';
  end if;
  insert into public.prep_attendance (session_id, servant_id)
  values (p_session, v_uid)
  on conflict (session_id, servant_id) do nothing
  returning id into v_id;
  if v_id is null then
    return false;
  end if;
  perform public.ledger_add(v_session.service_id, v_uid,
    public.rule_points(v_session.service_id, 'preparation'), 'preparation', v_id);
  return true;
end;
$$;

-- Admin marks a servant present (with points) or absent (reverses points).
create function public.mark_prep_attendance(p_session uuid, p_servant uuid, p_present boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_service uuid := public.prep_session_service_id(p_session);
  v_id uuid;
begin
  if v_service is null or not public.is_service_admin(v_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_present then
    if not public.is_active_member(p_servant, v_service, 'servant') then
      raise exception 'not a servant' using errcode = '22023';
    end if;
    insert into public.prep_attendance (session_id, servant_id)
    values (p_session, p_servant)
    on conflict (session_id, servant_id) do nothing
    returning id into v_id;
    if v_id is not null then
      perform public.ledger_add(v_service, p_servant,
        public.rule_points(v_service, 'preparation'), 'preparation', v_id);
    end if;
  else
    -- The delete trigger below reverses the points.
    delete from public.prep_attendance where session_id = p_session and servant_id = p_servant;
  end if;
end;
$$;

-- Attendance per session with every active servant (admin screen).
create function public.prep_attendance_sheet(p_session uuid)
returns table (servant_id uuid, full_name text, present boolean, checked_in_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_service uuid := public.prep_session_service_id(p_session);
begin
  if v_service is null or not public.is_service_admin(v_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select sm.user_id, p.full_name, pa.id is not null, pa.checked_in_at
    from public.service_members sm
    join public.profiles p on p.id = sm.user_id
    left join public.prep_attendance pa on pa.session_id = p_session and pa.servant_id = sm.user_id
    where sm.service_id = v_service and sm.role = 'servant' and sm.status = 'active'
    order by p.full_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deleting a visit or an attendance (admin correction, or deleting a prep
-- session) reverses the points it earned, so the ledger always matches the
-- activity. Skipped when the service or the user is itself being deleted.
-- ---------------------------------------------------------------------------
create function public.reverse_ledger_for_source()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e public.points_ledger;
begin
  for e in
    select * from public.points_ledger l
    where l.source_id = old.id
      and not exists (select 1 from public.points_ledger r where r.source_id = l.id)
      and exists (select 1 from public.services s where s.id = l.service_id)
      and exists (select 1 from public.profiles p where p.id = l.user_id)
  loop
    insert into public.points_ledger (service_id, class_id, user_id, points, reason, source_id, note, created_by)
    values (e.service_id, e.class_id, e.user_id, -e.points, e.reason, e.id, 'تصحيح', (select auth.uid()));
  end loop;
  return old;
end;
$$;

create trigger visits_reverse_points after delete on public.visits
  for each row execute function public.reverse_ledger_for_source();
create trigger prep_attendance_reverse_points after delete on public.prep_attendance
  for each row execute function public.reverse_ledger_for_source();

revoke execute on function
  public.cairo_today(),
  public.log_visit(uuid, uuid, public.visit_type, text, timestamptz),
  public.my_assigned(uuid),
  public.visit_overview(uuid),
  public.check_in_prep(uuid),
  public.mark_prep_attendance(uuid, uuid, boolean),
  public.prep_attendance_sheet(uuid),
  public.reverse_ledger_for_source()
from anon, public;
revoke execute on function public.reverse_ledger_for_source() from authenticated;
grant execute on function
  public.cairo_today(),
  public.log_visit(uuid, uuid, public.visit_type, text, timestamptz),
  public.my_assigned(uuid),
  public.visit_overview(uuid),
  public.check_in_prep(uuid),
  public.mark_prep_attendance(uuid, uuid, boolean),
  public.prep_attendance_sheet(uuid)
to authenticated;
