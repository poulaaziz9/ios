-- Meetings schedule (الاجتماعات): the service admin plans each meeting's day,
-- time, topic (the word/lesson) and the servant giving it. Members see the
-- timeline; a servant also sees the lessons assigned to them.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade, -- null = whole service
  meeting_date date not null,
  start_time time,
  topic text not null check (length(trim(topic)) > 0),
  details text,
  speaker_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index meetings_service_date on public.meetings (service_id, meeting_date);
create index meetings_speaker on public.meetings (speaker_id, meeting_date);

alter table public.meetings enable row level security;

create trigger meetings_fixed_parent before update on public.meetings
  for each row execute function public.forbid_parent_change('service_id');

-- The class (if any) belongs to the service, and the speaker is one of its
-- active servants.
create function public.meeting_refs_ok(p_service uuid, p_class uuid, p_speaker uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (p_class is null or exists (
            select 1 from public.classes c where c.id = p_class and c.service_id = p_service))
     and (p_speaker is null or public.is_active_member(p_speaker, p_service, 'servant'));
$$;

create policy "meetings: read"
  on public.meetings for select to authenticated
  using (public.can_see_class(service_id, class_id));
create policy "meetings: admin insert"
  on public.meetings for insert to authenticated
  with check (public.is_service_admin(service_id) and public.meeting_refs_ok(service_id, class_id, speaker_id));
create policy "meetings: admin update"
  on public.meetings for update to authenticated
  using (public.is_service_admin(service_id))
  with check (public.is_service_admin(service_id) and public.meeting_refs_ok(service_id, class_id, speaker_id));
create policy "meetings: admin delete"
  on public.meetings for delete to authenticated
  using (public.is_service_admin(service_id));

revoke all on public.meetings from anon, authenticated;
grant select, insert, update, delete on public.meetings to authenticated;

revoke execute on function public.meeting_refs_ok(uuid, uuid, uuid) from anon, public;
grant execute on function public.meeting_refs_ok(uuid, uuid, uuid) to authenticated;
