-- Phase 5: points. The ledger is append-only; only these SECURITY DEFINER
-- functions write to it. Corrections are new reversing entries.

-- Class a member's points are attributed to (served class first, then servant).
create function public.member_class_id(p_service uuid, p_user uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select sm.class_id from public.service_members sm
  where sm.service_id = p_service and sm.user_id = p_user
    and sm.status = 'active' and sm.role in ('served', 'servant')
  order by (sm.role = 'served') desc
  limit 1;
$$;

-- Configured points for a reason (0 when unset).
create function public.rule_points(p_service uuid, p_reason public.point_reason)
returns int
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select points from public.point_rules where service_id = p_service and reason = p_reason),
    0
  );
$$;

-- Internal: the single place ledger rows are inserted. Not callable by clients.
create function public.ledger_add(
  p_service uuid,
  p_user uuid,
  p_points int,
  p_reason public.point_reason,
  p_source uuid default null,
  p_note text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(p_points, 0) = 0 then
    return null;
  end if;
  insert into public.points_ledger (service_id, class_id, user_id, points, reason, source_id, note, created_by)
  values (
    p_service, public.member_class_id(p_service, p_user), p_user, p_points, p_reason,
    p_source, nullif(trim(p_note), ''), (select auth.uid())
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Manual award (or deduction) by a service admin.
create function public.award_points(
  p_service uuid,
  p_user uuid,
  p_points int,
  p_reason public.point_reason default 'manual',
  p_note text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_service_admin(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(p_points, 0) = 0 then
    raise exception 'points must not be zero' using errcode = '22023';
  end if;
  if p_reason not in ('manual', 'attendance') then
    -- Other reasons are produced by their own flows (visits, prep, quizzes…).
    raise exception 'reason not allowed' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.service_members
    where service_id = p_service and user_id = p_user
      and status = 'active' and role in ('served', 'servant')
  ) then
    raise exception 'not a member' using errcode = '22023';
  end if;
  return public.ledger_add(p_service, p_user, p_points, p_reason, null, p_note);
end;
$$;

-- Same award for several members at once (e.g. a whole class). Returns count.
create function public.award_points_many(
  p_service uuid,
  p_users uuid[],
  p_points int,
  p_reason public.point_reason default 'manual',
  p_note text default null
)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  u uuid;
  n int := 0;
begin
  foreach u in array coalesce(p_users, '{}') loop
    perform public.award_points(p_service, u, p_points, p_reason, p_note);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Correct a ledger entry with an equal and opposite one (once).
create function public.reverse_points(p_entry uuid, p_note text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v public.points_ledger;
begin
  select * into v from public.points_ledger where id = p_entry;
  if v.id is null or not public.is_service_admin(v.service_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.points_ledger where id = v.source_id) then
    raise exception 'cannot reverse a correction' using errcode = '22023';
  end if;
  if exists (select 1 from public.points_ledger where source_id = p_entry) then
    raise exception 'already reversed' using errcode = '23505';
  end if;
  insert into public.points_ledger (service_id, class_id, user_id, points, reason, source_id, note, created_by)
  values (v.service_id, v.class_id, v.user_id, -v.points, v.reason, v.id,
          coalesce(nullif(trim(p_note), ''), 'تصحيح'), (select auth.uid()))
  returning id into v.id;
  return v.id;
end;
$$;

-- Caller's own totals in a service: overall and in their current class,
-- with their rank among members of the same role.
create function public.my_points(p_service uuid)
returns table (
  role public.member_role, class_id uuid,
  service_total int, service_rank int, class_total int, class_rank int
)
language sql stable security definer set search_path = ''
as $$
  select sl.role, cl.class_id, sl.total_points, sl.rank, cl.total_points, cl.rank
  from public.v_service_leaderboard sl
  left join public.v_class_leaderboard cl
    on cl.service_id = sl.service_id and cl.user_id = sl.user_id and cl.role = sl.role
  where sl.service_id = p_service and sl.user_id = (select auth.uid())
  order by (sl.role = 'served') desc;
$$;

revoke execute on function
  public.member_class_id(uuid, uuid),
  public.rule_points(uuid, public.point_reason),
  public.ledger_add(uuid, uuid, int, public.point_reason, uuid, text),
  public.award_points(uuid, uuid, int, public.point_reason, text),
  public.award_points_many(uuid, uuid[], int, public.point_reason, text),
  public.reverse_points(uuid, text),
  public.my_points(uuid)
from anon, authenticated, public;
grant execute on function
  public.award_points(uuid, uuid, int, public.point_reason, text),
  public.award_points_many(uuid, uuid[], int, public.point_reason, text),
  public.reverse_points(uuid, text),
  public.my_points(uuid)
to authenticated;
