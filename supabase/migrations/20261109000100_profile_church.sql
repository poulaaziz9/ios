-- Each user picks their church when signing up (they can change it from their
-- profile). A church admin's phone lookup only finds people who picked their
-- church, so a servant who registered in another church stays invisible.

alter table public.profiles
  add column church_id uuid references public.churches (id) on delete set null;
create index profiles_church on public.profiles (church_id);

grant update (church_id) on public.profiles to authenticated;

-- Existing accounts: fill it in when they already belong to exactly one church
-- (a church role or a service membership). Platform admins are left alone.
update public.profiles p
set church_id = c.church_id
from (
  select user_id, min(church_id::text)::uuid as church_id
  from (
    select cr.user_id, cr.church_id from public.church_roles cr
    union
    select sm.user_id, s.church_id
    from public.service_members sm
    join public.services s on s.id = sm.service_id
    where sm.status <> 'removed'
  ) m
  group by user_id
  having count(distinct church_id) = 1
) c
where p.id = c.user_id and p.church_id is null and not p.is_super_admin;

-- Churches to pick from on the signup page (open to visitors: only names).
create function public.signup_churches()
returns table (id uuid, name text)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.name from public.churches c order by c.name;
$$;
revoke execute on function public.signup_churches() from public;
grant execute on function public.signup_churches() to anon, authenticated;

-- The new account's profile, with the church picked at signup (ignored if it
-- doesn't exist).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  picked uuid;
begin
  begin
    picked := nullif(new.raw_user_meta_data ->> 'church_id', '')::uuid;
  exception when invalid_text_representation then
    picked := null;
  end;
  insert into public.profiles (id, full_name, phone, church_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    (select c.id from public.churches c where c.id = picked)
  );
  return new;
end;
$$;

-- Phone lookup for adding a servant or appointing a service admin. A church
-- admin only finds people who chose their church; a super admin finds anyone.
drop function public.find_user_by_phone(text);
create function public.find_user_by_phone(p_phone text, p_church uuid)
returns table (id uuid, full_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_church_admin(p_church) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name from public.profiles p
    where p.phone = p_phone
      and (p.church_id = p_church or public.is_super_admin());
end;
$$;
revoke execute on function public.find_user_by_phone(text, uuid) from public, anon;
grant execute on function public.find_user_by_phone(text, uuid) to authenticated;

-- True when the user may be added to this church's services: they chose the
-- church, or they are already part of it (accounts from before this change).
create function public.user_in_church(p_user uuid, p_church uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_user and p.church_id = p_church)
      or exists (select 1 from public.church_roles cr where cr.user_id = p_user and cr.church_id = p_church)
      or exists (
        select 1 from public.service_members sm join public.services s on s.id = sm.service_id
        where sm.user_id = p_user and s.church_id = p_church
      );
$$;
revoke execute on function public.user_in_church(uuid, uuid) from public, anon;
grant execute on function public.user_in_church(uuid, uuid) to authenticated;

-- Appointing a service admin (or adding a servant) directly: only people of
-- that church.
alter policy "service_members: insert" on public.service_members
  with check (
    case role
      when 'served' then public.is_service_admin(service_id)
      else public.is_church_admin(public.service_church_id(service_id))
        and (public.is_super_admin() or public.user_in_church(user_id, public.service_church_id(service_id)))
    end
  );

create or replace function public.set_servant_services(p_church uuid, p_user uuid, p_services uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  wanted uuid[] := coalesce(p_services, '{}');
begin
  if not public.is_church_admin(p_church) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if not (public.is_super_admin() or public.user_in_church(p_user, p_church)) then
    raise exception 'user not in church' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(wanted) w(id)
    where not exists (select 1 from public.services s where s.id = w.id and s.church_id = p_church)
  ) then
    raise exception 'service not in church' using errcode = '42501';
  end if;

  insert into public.church_roles (church_id, user_id, role)
  values (p_church, p_user, 'servant')
  on conflict (church_id, user_id, role) do nothing;

  insert into public.service_members (service_id, user_id, role, status)
  select w.id, p_user, 'servant', 'active' from unnest(wanted) w(id)
  on conflict (service_id, user_id, role) do update set status = 'active';

  delete from public.service_members sm
  using public.services s
  where s.id = sm.service_id
    and s.church_id = p_church
    and sm.user_id = p_user
    and sm.role = 'servant'
    and not (sm.service_id = any (wanted));
end;
$$;
