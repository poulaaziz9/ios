-- Phase 2: RLS helper functions.
-- All are SECURITY DEFINER (so they can read membership tables without
-- recursing through RLS), STABLE, and pin search_path to ''.
-- They answer questions about the *calling* user (auth.uid()).

-- Platform owner.
create function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- Church admin of p_church (super admins count as admins everywhere).
create function public.is_church_admin(p_church uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_super_admin() or exists (
    select 1 from public.church_roles cr
    where cr.church_id = p_church
      and cr.user_id = (select auth.uid())
      and cr.role = 'church_admin'
  );
$$;

create function public.service_church_id(p_service uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.church_id from public.services s where s.id = p_service;
$$;

-- Service admin of p_service, OR church admin of its church, OR super admin.
create function public.is_service_admin(p_service uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_church_admin(public.service_church_id(p_service)) or exists (
    select 1 from public.service_members sm
    where sm.service_id = p_service
      and sm.user_id = (select auth.uid())
      and sm.role = 'service_admin'
      and sm.status = 'active'
  );
$$;

-- Any active role in the service.
create function public.is_service_member(p_service uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.service_members sm
    where sm.service_id = p_service
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
  );
$$;

-- Caller holds an active p_role in the service.
create function public.has_service_role(p_service uuid, p_role public.member_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.service_members sm
    where sm.service_id = p_service
      and sm.user_id = (select auth.uid())
      and sm.role = p_role
      and sm.status = 'active'
  );
$$;

-- p_user holds an active p_role in the service (used in WITH CHECK clauses).
create function public.is_active_member(p_user uuid, p_service uuid, p_role public.member_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.service_members sm
    where sm.service_id = p_service
      and sm.user_id = p_user
      and sm.role = p_role
      and sm.status = 'active'
  );
$$;

-- Caller is an active servant of the service and is assigned to visit p_served.
create function public.is_assigned_servant(p_served uuid, p_service uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_service_role(p_service, 'servant') and exists (
    select 1 from public.servant_assignments sa
    where sa.service_id = p_service
      and sa.served_id = p_served
      and sa.servant_id = (select auth.uid())
  );
$$;

-- Can the caller see content targeted at p_class (null = whole service)?
-- Admins and servants see every class; served see their own class only.
create function public.can_see_class(p_service uuid, p_class uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_service_admin(p_service)
    or public.has_service_role(p_service, 'servant')
    or (p_class is null and public.is_service_member(p_service))
    or exists (
      select 1 from public.service_members sm
      where sm.service_id = p_service
        and sm.user_id = (select auth.uid())
        and sm.class_id = p_class
        and sm.status = 'active'
    );
$$;

-- Churches the caller is connected to (admin, servant pool, or service member).
create function public.can_see_church(p_church uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_church_admin(p_church)
    or exists (
      select 1 from public.church_roles cr
      where cr.church_id = p_church and cr.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.service_members sm
      join public.services s on s.id = sm.service_id
      where s.church_id = p_church
        and sm.user_id = (select auth.uid())
        and sm.status = 'active'
    );
$$;

-- Profiles are visible to: self, super admin, church admins of a church the
-- user belongs to, service admins of any service the user is in, and fellow
-- active members of a shared service (needed for names on leaderboards).
create function public.can_see_profile(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_user = (select auth.uid())
    or public.is_super_admin()
    or exists (
      select 1 from public.church_roles cr
      where cr.user_id = p_user and public.is_church_admin(cr.church_id)
    )
    or exists (
      select 1 from public.service_members sm
      where sm.user_id = p_user
        and (
          public.is_service_admin(sm.service_id)
          or (sm.status = 'active' and public.is_service_member(sm.service_id))
        )
    );
$$;

-- Phone numbers are not readable through the profiles table (column grant).
-- Only self, admins over the user, and their assigned servants get it here.
create function public.visible_phone(p_user uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select p.phone from public.profiles p
  where p.id = p_user
    and (
      p_user = (select auth.uid())
      or public.is_super_admin()
      or exists (
        select 1 from public.church_roles cr
        where cr.user_id = p_user and public.is_church_admin(cr.church_id)
      )
      or exists (
        select 1 from public.service_members sm
        where sm.user_id = p_user
          and (
            public.is_service_admin(sm.service_id)
            or public.is_assigned_servant(p_user, sm.service_id)
          )
      )
    );
$$;

-- Parent lookups used by policies on child tables.
create function public.prep_session_service_id(p_session uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select ps.service_id from public.prep_sessions ps where ps.id = p_session;
$$;

create function public.competition_service_id(p_competition uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select c.service_id from public.competitions c where c.id = p_competition;
$$;

create function public.gift_service_id(p_gift uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select g.service_id from public.gifts g where g.id = p_gift;
$$;

create function public.achievement_service_id(p_achievement uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select a.service_id from public.achievements a where a.id = p_achievement;
$$;

-- A member may see a competition once it is published and has started.
create function public.can_see_competition(p_competition uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.competitions c
    where c.id = p_competition
      and (
        public.is_service_admin(c.service_id)
        or (
          c.is_published
          and (c.starts_at is null or c.starts_at <= now())
          and public.can_see_class(c.service_id, c.class_id)
        )
      )
  );
$$;

-- Admin-only answer key (correct_index is not selectable via the table).
create function public.competition_answer_key(p_competition uuid)
returns table (question_id uuid, correct_index int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_service_admin(public.competition_service_id(p_competition)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select q.id, q.correct_index
    from public.competition_questions q
    where q.competition_id = p_competition
    order by q.sort_order;
end;
$$;

-- Storage paths start with a uuid folder; a malformed one must not error.
create function public.try_uuid(p_text text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return p_text::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- Rows may never be moved to another parent (service, church, competition…).
-- Usage: create trigger … execute function public.forbid_parent_change('service_id');
create function public.forbid_parent_change()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  col text;
begin
  foreach col in array tg_argv loop
    if (to_jsonb(new) ->> col) is distinct from (to_jsonb(old) ->> col) then
      raise exception '% cannot be changed', col using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

-- Helpers answer only about the caller; anon never needs them.
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated, service_role;
