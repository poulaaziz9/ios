-- Phase 3: hierarchy admin (super admin → churches, church admin → services,
-- servants and service admins).

-- ---------------------------------------------------------------------------
-- Finding users
-- Super admins can search everyone by name or phone digits. Church admins can
-- only look up one user by an exact phone number, so nobody can browse the
-- platform's (mostly minor) users.
-- ---------------------------------------------------------------------------
create function public.search_users(p_query text)
returns table (id uuid, full_name text, phone text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  q text := trim(coalesce(p_query, ''));
  digits text := regexp_replace(q, '\D', '', 'g');
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(q) < 2 then
    return;
  end if;
  return query
    select p.id, p.full_name, p.phone
    from public.profiles p
    where p.full_name ilike '%' || replace(replace(q, '%', ''), '_', '') || '%'
       or (length(digits) >= 4 and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || digits || '%')
    order by p.full_name
    limit 20;
end;
$$;

create function public.find_user_by_phone(p_phone text)
returns table (id uuid, full_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (
    public.is_super_admin()
    or exists (
      select 1 from public.church_roles cr
      where cr.user_id = (select auth.uid()) and cr.role = 'church_admin'
    )
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name from public.profiles p where p.phone = p_phone;
end;
$$;

-- ---------------------------------------------------------------------------
-- Church admins of a church (super admin screen)
-- ---------------------------------------------------------------------------
create function public.church_admins(p_church uuid)
returns table (user_id uuid, full_name text, phone text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_church_admin(p_church) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select cr.user_id, p.full_name, p.phone, cr.created_at
    from public.church_roles cr
    join public.profiles p on p.id = cr.user_id
    where cr.church_id = p_church and cr.role = 'church_admin'
    order by p.full_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Servants of a church: the pool plus anyone serving in one of its services,
-- with the services they are active in.
-- ---------------------------------------------------------------------------
create function public.church_servants(p_church uuid)
returns table (user_id uuid, full_name text, phone text, in_pool boolean, service_ids uuid[])
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_church_admin(p_church) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    with people as (
      select cr.user_id from public.church_roles cr
      where cr.church_id = p_church and cr.role = 'servant'
      union
      select sm.user_id from public.service_members sm
      join public.services s on s.id = sm.service_id
      where s.church_id = p_church and sm.role = 'servant' and sm.status = 'active'
    )
    select
      pe.user_id, p.full_name, p.phone,
      exists (
        select 1 from public.church_roles cr
        where cr.church_id = p_church and cr.user_id = pe.user_id and cr.role = 'servant'
      ),
      coalesce(
        (select array_agg(sm.service_id order by s.name)
         from public.service_members sm
         join public.services s on s.id = sm.service_id
         where s.church_id = p_church and sm.user_id = pe.user_id
           and sm.role = 'servant' and sm.status = 'active'),
        '{}'
      )
    from people pe
    join public.profiles p on p.id = pe.user_id
    order by p.full_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Set exactly which services of the church a servant serves in.
-- Adds them to the church's servant pool, (re)activates the chosen
-- memberships and removes the others. The church admin's add is final
-- (no service admin approval).
-- ---------------------------------------------------------------------------
create function public.set_servant_services(p_church uuid, p_user uuid, p_services uuid[])
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

-- Remove a servant from the church entirely (pool + all its services).
create function public.remove_church_servant(p_church uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_church_admin(p_church) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.service_members sm
  using public.services s
  where s.id = sm.service_id and s.church_id = p_church
    and sm.user_id = p_user and sm.role = 'servant';
  delete from public.church_roles
  where church_id = p_church and user_id = p_user and role = 'servant';
end;
$$;

-- ---------------------------------------------------------------------------
-- Visitation assignments only make sense between active members: remove them
-- when either side leaves or is deactivated.
-- ---------------------------------------------------------------------------
create function public.drop_assignments_on_membership_end()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or new.status <> 'active' then
    if old.role = 'servant' then
      delete from public.servant_assignments
      where service_id = old.service_id and servant_id = old.user_id;
    elsif old.role = 'served' then
      delete from public.servant_assignments
      where service_id = old.service_id and served_id = old.user_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger service_members_drop_assignments
  after update of status or delete on public.service_members
  for each row execute function public.drop_assignments_on_membership_end();

revoke execute on function
  public.search_users(text),
  public.find_user_by_phone(text),
  public.church_admins(uuid),
  public.church_servants(uuid),
  public.set_servant_services(uuid, uuid, uuid[]),
  public.remove_church_servant(uuid, uuid),
  public.drop_assignments_on_membership_end()
from anon, public;
grant execute on function
  public.search_users(text),
  public.find_user_by_phone(text),
  public.church_admins(uuid),
  public.church_servants(uuid),
  public.set_servant_services(uuid, uuid, uuid[]),
  public.remove_church_servant(uuid, uuid)
to authenticated;
