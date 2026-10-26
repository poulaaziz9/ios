-- Served members (kids) may rank against each other but must not see the
-- servants' points. Servant rows are now visible only to servants and admins
-- of the service. Same columns as before, so this is a drop-in replacement.

create or replace view public.v_service_leaderboard
with (security_invoker = off, security_barrier = on)
as
with totals as (
  select sm.service_id, sm.user_id, sm.role,
         coalesce(sum(pl.points), 0)::int as total_points
  from public.service_members sm
  left join public.points_ledger pl
    on pl.service_id = sm.service_id and pl.user_id = sm.user_id
  where sm.status = 'active' and sm.role in ('servant', 'served')
  group by sm.service_id, sm.user_id, sm.role
)
select t.service_id, t.user_id, t.role, p.full_name, p.avatar_url, t.total_points,
       rank() over (partition by t.service_id, t.role order by t.total_points desc)::int as rank
from totals t
join public.profiles p on p.id = t.user_id
where (public.is_service_member(t.service_id) or public.is_service_admin(t.service_id))
  and (
    t.role = 'served'
    or public.is_service_admin(t.service_id)
    or public.has_service_role(t.service_id, 'servant')
  );

create or replace view public.v_class_leaderboard
with (security_invoker = off, security_barrier = on)
as
with totals as (
  select sm.service_id, sm.class_id, sm.user_id, sm.role,
         coalesce(sum(pl.points), 0)::int as total_points
  from public.service_members sm
  left join public.points_ledger pl
    on pl.service_id = sm.service_id and pl.user_id = sm.user_id and pl.class_id = sm.class_id
  where sm.status = 'active' and sm.role in ('servant', 'served') and sm.class_id is not null
  group by sm.service_id, sm.class_id, sm.user_id, sm.role
)
select t.service_id, t.class_id, t.user_id, t.role, p.full_name, p.avatar_url, t.total_points,
       rank() over (partition by t.class_id, t.role order by t.total_points desc)::int as rank
from totals t
join public.profiles p on p.id = t.user_id
where (public.is_service_member(t.service_id) or public.is_service_admin(t.service_id))
  and (
    t.role = 'served'
    or public.is_service_admin(t.service_id)
    or public.has_service_role(t.service_id, 'servant')
  );
