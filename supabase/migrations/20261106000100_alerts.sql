-- Alerts for the people responsible:
--   * served kids who missed the last N meetings in a row (default 3, i.e.
--     "more than two"), for the service admin and the kid's assigned servant;
--   * servants who haven't logged a visit for more than N days (default 10),
--     for the service admin.
-- A meeting day is a day on which attendance was taken (someone marked
-- present). Days before a kid joined don't count against them.

create function public.absent_served(p_service uuid, p_min_missed int default 3)
returns table (
  served_id uuid, full_name text, class_id uuid, missed int, last_present date,
  servant_id uuid, servant_name text
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_admin boolean := public.is_service_admin(p_service);
begin
  if not (v_admin or public.has_service_role(p_service, 'servant')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    with days as (
      select distinct ma.meeting_date from public.meeting_attendance ma
      where ma.service_id = p_service and ma.present
    ),
    kids as (
      select sm.user_id, sm.class_id, sm.created_at,
             (select max(ma.meeting_date) from public.meeting_attendance ma
               where ma.service_id = p_service and ma.served_id = sm.user_id and ma.present) as last_present
      from public.service_members sm
      where sm.service_id = p_service and sm.role = 'served' and sm.status = 'active'
    ),
    counted as (
      select k.*,
             (select count(*) from days d
               where d.meeting_date > coalesce(k.last_present, '-infinity'::date)
                 and d.meeting_date >= (k.created_at at time zone 'Africa/Cairo')::date)::int as missed
      from kids k
    )
    select c.user_id, p.full_name, c.class_id, c.missed, c.last_present,
           sa.servant_id, sp.full_name
    from counted c
    join public.profiles p on p.id = c.user_id
    left join public.servant_assignments sa on sa.service_id = p_service and sa.served_id = c.user_id
    left join public.profiles sp on sp.id = sa.servant_id
    where c.missed >= greatest(p_min_missed, 1)
      and (v_admin or sa.servant_id = (select auth.uid()))
    order by c.missed desc, p.full_name;
end;
$$;

create function public.idle_servants(p_service uuid, p_days int default 10)
returns table (servant_id uuid, full_name text, last_visit timestamptz, assigned int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_service_admin(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select sm.user_id, p.full_name,
           (select max(v.visited_at) from public.visits v
             where v.service_id = p_service and v.servant_id = sm.user_id),
           (select count(*) from public.servant_assignments sa
             where sa.service_id = p_service and sa.servant_id = sm.user_id)::int
    from public.service_members sm
    join public.profiles p on p.id = sm.user_id
    where sm.service_id = p_service and sm.role = 'servant' and sm.status = 'active'
      -- Only servants who have kids to visit.
      and exists (select 1 from public.servant_assignments sa
                  where sa.service_id = p_service and sa.servant_id = sm.user_id)
      and coalesce(
            (select max(v.visited_at) from public.visits v
              where v.service_id = p_service and v.servant_id = sm.user_id),
            sm.created_at
          ) < now() - make_interval(days => greatest(p_days, 1))
    order by 3 nulls first, p.full_name;
end;
$$;

revoke execute on function
  public.absent_served(uuid, int),
  public.idle_servants(uuid, int)
from anon, public;
grant execute on function
  public.absent_served(uuid, int),
  public.idle_servants(uuid, int)
to authenticated;
