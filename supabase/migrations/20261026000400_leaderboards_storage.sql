-- Phase 2: leaderboard views + storage buckets.

-- ---------------------------------------------------------------------------
-- Leaderboards
-- These views run with the owner's rights (security_invoker = off) because a
-- member must rank against others whose ledger rows they cannot read
-- directly. Each view therefore filters to services the caller belongs to
-- and exposes only names, avatars and totals. Separate rankings per role
-- (servants vs served).
-- ---------------------------------------------------------------------------
create view public.v_service_leaderboard
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
where public.is_service_member(t.service_id) or public.is_service_admin(t.service_id);

create view public.v_class_leaderboard
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
where public.is_service_member(t.service_id) or public.is_service_admin(t.service_id);

revoke all on public.v_service_leaderboard, public.v_class_leaderboard from anon, authenticated;
grant select on public.v_service_leaderboard, public.v_class_leaderboard to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
--   avatars/<user_id>/<file>          private; owner writes, visible to whoever
--                                      can see the profile (signed URLs)
--   service-media/<service_id>/<file> private; service admins write, members read
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('service-media', 'service-media', false, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: read visible profiles"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_see_profile(public.try_uuid((storage.foldername(name))[1]))
  );
create policy "avatars: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.try_uuid((storage.foldername(name))[1]) = (select auth.uid())
  );
create policy "avatars: owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and public.try_uuid((storage.foldername(name))[1]) = (select auth.uid())
  )
  with check (
    bucket_id = 'avatars'
    and public.try_uuid((storage.foldername(name))[1]) = (select auth.uid())
  );
create policy "avatars: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and public.try_uuid((storage.foldername(name))[1]) = (select auth.uid())
  );

create policy "service-media: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'service-media'
    and (
      public.is_service_member(public.try_uuid((storage.foldername(name))[1]))
      or public.is_service_admin(public.try_uuid((storage.foldername(name))[1]))
    )
  );
create policy "service-media: admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-media'
    and public.is_service_admin(public.try_uuid((storage.foldername(name))[1]))
  );
create policy "service-media: admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'service-media'
    and public.is_service_admin(public.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'service-media'
    and public.is_service_admin(public.try_uuid((storage.foldername(name))[1]))
  );
create policy "service-media: admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'service-media'
    and public.is_service_admin(public.try_uuid((storage.foldername(name))[1]))
  );
