-- Served kids' attendance at the weekly meeting (اجتماع). Any active servant
-- of the service (or its admins) records who came on a given day; each kid
-- marked present earns the service's "attendance" rule points.
--
-- Unticking a kid keeps the row with present = false and reverses its
-- points, so the ledger always matches the sheet (and no rows are deleted).

create table public.meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  served_id uuid not null references public.profiles (id) on delete cascade,
  meeting_date date not null,
  present boolean not null default true,
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (service_id, served_id, meeting_date)
);
create index meeting_attendance_service_date on public.meeting_attendance (service_id, meeting_date);

alter table public.meeting_attendance enable row level security;

-- Servants and admins see the service's sheets; a kid sees their own record.
-- Writes only through set_meeting_attendance().
create policy "meeting_attendance: staff and self read"
  on public.meeting_attendance for select to authenticated
  using (
    public.is_service_admin(service_id)
    or public.has_service_role(service_id, 'servant')
    or (served_id = (select auth.uid()) and public.is_service_member(service_id))
  );

revoke all on public.meeting_attendance from anon, authenticated;
grant select on public.meeting_attendance to authenticated;

create trigger meeting_attendance_fixed_parent before update on public.meeting_attendance
  for each row execute function public.forbid_parent_change('service_id', 'served_id', 'meeting_date');

create function public.can_take_attendance(p_service uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_service_admin(p_service) or public.has_service_role(p_service, 'servant');
$$;

-- Every active served member with their status for that day.
create function public.meeting_attendance_sheet(p_service uuid, p_date date)
returns table (served_id uuid, full_name text, avatar_url text, class_id uuid, present boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.can_take_attendance(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select sm.user_id, p.full_name, p.avatar_url, sm.class_id, coalesce(ma.present, false)
    from public.service_members sm
    join public.profiles p on p.id = sm.user_id
    left join public.meeting_attendance ma
      on ma.service_id = p_service and ma.served_id = sm.user_id and ma.meeting_date = p_date
    where sm.service_id = p_service and sm.role = 'served' and sm.status = 'active'
    order by p.full_name;
end;
$$;

-- Save the sheet for a day: exactly p_present (active served members) are
-- present. Returns how many are present. Future days are refused.
create function public.set_meeting_attendance(p_service uuid, p_date date, p_present uuid[])
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  wanted uuid[] := coalesce(p_present, '{}');
  v_points int := public.rule_points(p_service, 'attendance');
  r record;
  v_id uuid;
  e public.points_ledger;
begin
  if not public.can_take_attendance(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_date is null or p_date > public.cairo_today() then
    raise exception 'future_date';
  end if;

  for r in
    select sm.user_id, ma.id as row_id, coalesce(ma.present, false) as was_present,
           sm.user_id = any (wanted) as now_present
    from public.service_members sm
    left join public.meeting_attendance ma
      on ma.service_id = p_service and ma.served_id = sm.user_id and ma.meeting_date = p_date
    where sm.service_id = p_service and sm.role = 'served' and sm.status = 'active'
  loop
    if r.now_present and not r.was_present then
      insert into public.meeting_attendance (service_id, served_id, meeting_date, present)
      values (p_service, r.user_id, p_date, true)
      on conflict (service_id, served_id, meeting_date)
        do update set present = true, recorded_by = (select auth.uid()), updated_at = now()
      returning id into v_id;
      perform public.ledger_add(p_service, r.user_id, v_points, 'attendance', v_id);
    elsif r.was_present and not r.now_present then
      update public.meeting_attendance
         set present = false, recorded_by = (select auth.uid()), updated_at = now()
       where id = r.row_id;
      -- Reverse whatever this record earned and is not reversed yet.
      for e in
        select * from public.points_ledger l
        where l.source_id = r.row_id
          and not exists (select 1 from public.points_ledger x where x.source_id = l.id)
      loop
        insert into public.points_ledger (service_id, class_id, user_id, points, reason, source_id, note, created_by)
        values (e.service_id, e.class_id, e.user_id, -e.points, e.reason, e.id, 'تصحيح', (select auth.uid()));
      end loop;
    end if;
  end loop;

  return (
    select count(*)::int from public.meeting_attendance
    where service_id = p_service and meeting_date = p_date and present
  );
end;
$$;

-- Recent meeting days with how many came.
create function public.recent_meetings(p_service uuid)
returns table (meeting_date date, present_count int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.can_take_attendance(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select ma.meeting_date, count(*) filter (where ma.present)::int
    from public.meeting_attendance ma
    where ma.service_id = p_service
    group by ma.meeting_date
    having count(*) filter (where ma.present) > 0
    order by ma.meeting_date desc
    limit 20;
end;
$$;

revoke execute on function
  public.can_take_attendance(uuid),
  public.meeting_attendance_sheet(uuid, date),
  public.set_meeting_attendance(uuid, date, uuid[]),
  public.recent_meetings(uuid)
from anon, public;
grant execute on function
  public.can_take_attendance(uuid),
  public.meeting_attendance_sheet(uuid, date),
  public.set_meeting_attendance(uuid, date, uuid[]),
  public.recent_meetings(uuid)
to authenticated;
