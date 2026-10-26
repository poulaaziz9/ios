-- خدمتي: باقي إعداد الداتابيز (الخطوات ٦ لـ ١١).
-- انسخ الملف ده كله والصقه في Supabase → SQL Editor → Run.
-- Remaining hosted setup: migrations 6–11 in order, in one transaction.
-- Generated from supabase/migrations; do not edit by hand.

begin;

-- ===== 20261027000100_hierarchy_admin =====
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

-- ===== 20261028000100_join_codes =====
-- Phase 4: service admin core — join codes (one per class), joining, roster.
-- Decision (owner, phase 4): every join code belongs to a class. There is no
-- service-level code, so kids always join straight into a class as active.

alter table public.join_codes alter column class_id set not null;

-- ---------------------------------------------------------------------------
-- Code generation: 6 chars from an alphabet without look-alikes (0/O, 1/I/L).
-- ---------------------------------------------------------------------------
create function public.generate_join_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      into candidate
      from generate_series(1, 6);
    exit when not exists (select 1 from public.join_codes where code = candidate);
  end loop;
  return candidate;
end;
$$;

alter table public.join_codes alter column code set default public.generate_join_code();

-- Expiry is chosen as a date; the code works until the end of that day in Cairo.
create function public.cairo_end_of_day(p_date date)
returns timestamptz
language sql immutable set search_path = ''
as $$
  select ((p_date + 1)::timestamp at time zone 'Africa/Cairo');
$$;

create function public.normalize_join_code(p_code text)
returns text
language sql immutable set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create function public.create_join_code(p_class uuid, p_expires_on date default null)
returns public.join_codes
language plpgsql security definer set search_path = ''
as $$
declare
  v_service uuid;
  v_row public.join_codes;
begin
  select service_id into v_service from public.classes where id = p_class;
  if v_service is null or not public.is_service_admin(v_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.join_codes (service_id, class_id, expires_at, created_by)
  values (
    v_service, p_class,
    case when p_expires_on is null then null else public.cairo_end_of_day(p_expires_on) end,
    (select auth.uid())
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- New code for the same class; the old QR stops working immediately.
create function public.regenerate_join_code(p_code_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_service uuid;
  v_code text;
begin
  select service_id into v_service from public.join_codes where id = p_code_id;
  if v_service is null or not public.is_service_admin(v_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.join_codes
     set code = public.generate_join_code(), is_active = true
   where id = p_code_id
  returning code into v_code;
  return v_code;
end;
$$;

create function public.set_join_code_expiry(p_code_id uuid, p_expires_on date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_service uuid;
begin
  select service_id into v_service from public.join_codes where id = p_code_id;
  if v_service is null or not public.is_service_admin(v_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.join_codes
     set expires_at = case when p_expires_on is null then null else public.cairo_end_of_day(p_expires_on) end
   where id = p_code_id;
end;
$$;

-- Everyone in the service with phone numbers (admin screens).
create function public.service_roster(p_service uuid)
returns table (
  member_id uuid, user_id uuid, full_name text, phone text, avatar_url text,
  role public.member_role, class_id uuid, status public.member_status, joined_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_service_admin(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select sm.id, sm.user_id, p.full_name, p.phone, p.avatar_url,
           sm.role, sm.class_id, sm.status, sm.created_at
    from public.service_members sm
    join public.profiles p on p.id = sm.user_id
    where sm.service_id = p_service
    order by sm.role, p.full_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Joining
-- ---------------------------------------------------------------------------

-- What a valid code leads to, for the confirm screen. No row = unusable code.
create function public.join_code_preview(p_code text)
returns table (service_id uuid, service_name text, church_name text, class_name text, already_member boolean)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.name, ch.name, c.name,
         exists (
           select 1 from public.service_members sm
           where sm.service_id = s.id and sm.user_id = (select auth.uid())
             and sm.role = 'served' and sm.status = 'active'
         )
  from public.join_codes jc
  join public.services s on s.id = jc.service_id
  join public.churches ch on ch.id = s.church_id
  join public.classes c on c.id = jc.class_id
  where jc.code = public.normalize_join_code(p_code)
    and jc.is_active
    and (jc.expires_at is null or jc.expires_at > now())
    and (select auth.uid()) is not null;
$$;

-- Join a service as `served` in the code's class. Returns the service id.
-- Errors (message): invalid_code, removed (an admin removed them — only the
-- admin can bring them back), staff (they serve in this service already).
create function public.join_with_code(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_jc public.join_codes;
  v_existing public.service_members;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_jc from public.join_codes
  where code = public.normalize_join_code(p_code)
    and is_active
    and (expires_at is null or expires_at > now());
  if v_jc.id is null then
    raise exception 'invalid_code';
  end if;

  if exists (
    select 1 from public.service_members
    where service_id = v_jc.service_id and user_id = v_uid
      and role in ('servant', 'service_admin') and status = 'active'
  ) then
    raise exception 'staff';
  end if;

  select * into v_existing from public.service_members
  where service_id = v_jc.service_id and user_id = v_uid and role = 'served';

  if v_existing.id is null then
    insert into public.service_members (service_id, user_id, role, class_id, status)
    values (v_jc.service_id, v_uid, 'served', v_jc.class_id, 'active');
  elsif v_existing.status = 'removed' then
    raise exception 'removed';
  elsif v_existing.status = 'pending' then
    update public.service_members set status = 'active', class_id = v_jc.class_id
    where id = v_existing.id;
  end if;
  -- Already active: nothing to do (scanning another class's code does not
  -- move a kid; the service admin moves kids between classes).

  return v_jc.service_id;
end;
$$;

revoke execute on function
  public.generate_join_code(),
  public.cairo_end_of_day(date),
  public.normalize_join_code(text),
  public.create_join_code(uuid, date),
  public.regenerate_join_code(uuid),
  public.set_join_code_expiry(uuid, date),
  public.service_roster(uuid),
  public.join_code_preview(text),
  public.join_with_code(text)
from anon, public;
grant execute on function
  public.generate_join_code(),
  public.create_join_code(uuid, date),
  public.regenerate_join_code(uuid),
  public.set_join_code_expiry(uuid, date),
  public.service_roster(uuid),
  public.join_code_preview(text),
  public.join_with_code(text)
to authenticated;

-- ===== 20261029000100_points =====
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

-- ===== 20261030000100_servant =====
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

-- ===== 20261031000100_competitions =====
-- Phase 7: served interface — competitions graded on the server.

-- Admins create/edit competitions with Cairo wall-clock times.
create function public.save_competition(
  p_id uuid,
  p_service uuid,
  p_class uuid,
  p_title text,
  p_description text,
  p_starts_local timestamp,
  p_ends_local timestamp,
  p_max_points int
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_service_admin(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_id is null then
    insert into public.competitions (service_id, class_id, title, description, starts_at, ends_at, max_points)
    values (
      p_service, p_class, trim(p_title), nullif(trim(p_description), ''),
      p_starts_local at time zone 'Africa/Cairo', p_ends_local at time zone 'Africa/Cairo',
      greatest(coalesce(p_max_points, 0), 0)
    )
    returning id into v_id;
  else
    update public.competitions
       set class_id = p_class,
           title = trim(p_title),
           description = nullif(trim(p_description), ''),
           starts_at = p_starts_local at time zone 'Africa/Cairo',
           ends_at = p_ends_local at time zone 'Africa/Cairo',
           max_points = greatest(coalesce(p_max_points, 0), 0)
     where id = p_id and service_id = p_service
    returning id into v_id;
    if v_id is null then
      raise exception 'not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

-- A served member submits answers once, while the competition is open.
-- p_answers: {"<question_id>": <option index>, …}. Unanswered or malformed
-- answers count as wrong. Score is capped at max_points when it is set, and
-- credited to the ledger. correct_index never leaves the database.
create function public.submit_competition(p_competition uuid, p_answers jsonb)
returns table (score int, correct int, total int)
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_comp public.competitions;
  v_score int;
  v_correct int;
  v_total int;
  v_entry uuid;
  v_answers jsonb := case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end;
begin
  select * into v_comp from public.competitions where id = p_competition;
  if v_comp.id is null
     or not public.has_service_role(v_comp.service_id, 'served')
     or not public.can_see_competition(p_competition) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_comp.ends_at is not null and v_comp.ends_at <= now() then
    raise exception 'closed';
  end if;
  if exists (
    select 1 from public.competition_entries
    where competition_id = p_competition and user_id = v_uid
  ) then
    raise exception 'already_submitted';
  end if;

  select
    coalesce(sum(q.points) filter (where ok), 0)::int,
    count(*) filter (where ok)::int,
    count(*)::int
  into v_score, v_correct, v_total
  from (
    select q.points,
           jsonb_typeof(v_answers -> q.id::text) = 'number'
             and (v_answers ->> q.id::text)::numeric = q.correct_index as ok
    from public.competition_questions q
    where q.competition_id = p_competition
  ) q;

  if v_comp.max_points > 0 then
    v_score := least(v_score, v_comp.max_points);
  end if;

  insert into public.competition_entries (competition_id, user_id, answers, score)
  values (p_competition, v_uid, v_answers, v_score)
  returning id into v_entry;

  perform public.ledger_add(v_comp.service_id, v_uid, v_score, 'competition', v_entry, v_comp.title);

  return query select v_score, v_correct, v_total;
end;
$$;

revoke execute on function
  public.save_competition(uuid, uuid, uuid, text, text, timestamp, timestamp, int),
  public.submit_competition(uuid, jsonb)
from anon, public;
grant execute on function
  public.save_competition(uuid, uuid, uuid, text, text, timestamp, timestamp, int),
  public.submit_competition(uuid, jsonb)
to authenticated;

-- ===== 20261101000100_extras =====
-- Phase 8: gifts & redemptions, achievements engine.

-- ===========================================================================
-- Gifts
-- A request reserves points (they can't be spent twice) but the ledger is
-- debited only when an admin approves. Rejecting an approved request refunds.
-- ===========================================================================
alter table public.gift_redemptions
  add column decided_at timestamptz,
  add column decided_by uuid references public.profiles (id) on delete set null;

-- Points the caller can still spend: total minus pending requests.
create function public.available_points(p_service uuid, p_user uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select coalesce((select sum(points) from public.points_ledger
                   where service_id = p_service and user_id = p_user), 0)::int
       - coalesce((select sum(g.cost_points) from public.gift_redemptions r
                   join public.gifts g on g.id = r.gift_id
                   where g.service_id = p_service and r.user_id = p_user and r.status = 'requested'), 0)::int;
$$;

create function public.my_available_points(p_service uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select public.available_points(p_service, (select auth.uid()));
$$;

-- Errors (message): unavailable, out_of_stock, insufficient_points.
create function public.redeem_gift(p_gift uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_gift public.gifts;
  v_pending int;
  v_id uuid;
begin
  -- Lock the gift so two requests can't take the last item.
  select * into v_gift from public.gifts where id = p_gift for update;
  if v_gift.id is null or not public.has_service_role(v_gift.service_id, 'served') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not v_gift.is_active then
    raise exception 'unavailable';
  end if;
  if v_gift.stock is not null then
    select count(*) into v_pending from public.gift_redemptions
    where gift_id = p_gift and status = 'requested';
    if v_gift.stock - v_pending <= 0 then
      raise exception 'out_of_stock';
    end if;
  end if;
  if public.available_points(v_gift.service_id, v_uid) < v_gift.cost_points then
    raise exception 'insufficient_points';
  end if;
  insert into public.gift_redemptions (gift_id, user_id) values (p_gift, v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

-- Admin decision. Allowed transitions:
--   requested → approved (debit + stock−1) | rejected
--   approved  → delivered | rejected (refund + stock+1)
create function public.decide_redemption(p_redemption uuid, p_status public.redemption_status)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_r public.gift_redemptions;
  v_gift public.gifts;
begin
  select * into v_r from public.gift_redemptions where id = p_redemption for update;
  select * into v_gift from public.gifts where id = v_r.gift_id for update;
  if v_r.id is null or not public.is_service_admin(v_gift.service_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not (
    (v_r.status = 'requested' and p_status in ('approved', 'rejected'))
    or (v_r.status = 'approved' and p_status in ('delivered', 'rejected'))
  ) then
    raise exception 'invalid_transition';
  end if;

  if p_status = 'approved' then
    -- available_points already subtracts this request's reservation, so it
    -- only goes negative if other pending requests used the same points.
    if public.available_points(v_gift.service_id, v_r.user_id) < 0 then
      raise exception 'insufficient_points';
    end if;
    if v_gift.stock is not null then
      if v_gift.stock <= 0 then
        raise exception 'out_of_stock';
      end if;
      update public.gifts set stock = stock - 1 where id = v_gift.id;
    end if;
    perform public.ledger_add(v_gift.service_id, v_r.user_id, -v_gift.cost_points,
      'gift_redemption', v_r.id, v_gift.name);
  elsif p_status = 'rejected' and v_r.status = 'approved' then
    if v_gift.stock is not null then
      update public.gifts set stock = stock + 1 where id = v_gift.id;
    end if;
    perform public.ledger_add(v_gift.service_id, v_r.user_id, v_gift.cost_points,
      'gift_redemption', v_r.id, 'استرجاع: ' || v_gift.name);
  end if;

  update public.gift_redemptions
     set status = p_status, decided_at = now(), decided_by = (select auth.uid())
   where id = p_redemption;
end;
$$;

-- Gift debits/refunds follow the request's status; they are undone by
-- rejecting the request, never by a manual ledger correction.
create or replace function public.reverse_points(p_entry uuid, p_note text default null)
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
  if v.reason = 'gift_redemption' then
    raise exception 'reject the gift request instead' using errcode = '22023';
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

-- ===========================================================================
-- Achievements engine
-- criteria: {"type": "points_total" | "competitions_count" | "visits_count", "gte": N}
-- Earned achievements are permanent (a later correction doesn't revoke them).
-- Each new achievement credits the service's "achievement" point rule.
-- ===========================================================================
alter table public.achievements
  add constraint achievements_criteria_valid check (
    criteria ->> 'type' in ('points_total', 'competitions_count', 'visits_count')
    and (criteria ->> 'gte') ~ '^[0-9]+$'
  );

create function public.achievement_progress(p_service uuid, p_user uuid, p_type text)
returns int
language sql stable security definer set search_path = ''
as $$
  select case p_type
    when 'points_total' then
      (select coalesce(sum(points), 0) from public.points_ledger
        where service_id = p_service and user_id = p_user)::int
    when 'competitions_count' then
      (select count(*) from public.competition_entries e
        join public.competitions c on c.id = e.competition_id
        where c.service_id = p_service and e.user_id = p_user)::int
    when 'visits_count' then
      (select count(*) from public.visits
        where service_id = p_service and servant_id = p_user)::int
    else 0
  end;
$$;

-- Award every achievement of the service the user now qualifies for.
create function public.evaluate_achievements(p_service uuid, p_user uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  a public.achievements;
  v_ua uuid;
  n int := 0;
begin
  if not exists (
    select 1 from public.service_members
    where service_id = p_service and user_id = p_user and status = 'active'
      and role in ('served', 'servant')
  ) then
    return 0;
  end if;
  for a in
    select * from public.achievements ach
    where ach.service_id = p_service
      and not exists (select 1 from public.user_achievements ua
                      where ua.achievement_id = ach.id and ua.user_id = p_user)
  loop
    if public.achievement_progress(p_service, p_user, a.criteria ->> 'type') >= (a.criteria ->> 'gte')::int then
      insert into public.user_achievements (achievement_id, user_id)
      values (a.id, p_user)
      on conflict (achievement_id, user_id) do nothing
      returning id into v_ua;
      if v_ua is not null then
        perform public.ledger_add(p_service, p_user, public.rule_points(p_service, 'achievement'),
          'achievement', v_ua, a.name);
        n := n + 1;
      end if;
    end if;
  end loop;
  return n;
end;
$$;

create function public.achievements_after_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'points_ledger' then
    -- Points from an achievement don't trigger another evaluation round.
    if new.reason <> 'achievement' and new.points > 0 then
      perform public.evaluate_achievements(new.service_id, new.user_id);
    end if;
  elsif tg_table_name = 'competition_entries' then
    perform public.evaluate_achievements(
      (select service_id from public.competitions where id = new.competition_id), new.user_id);
  elsif tg_table_name = 'visits' then
    perform public.evaluate_achievements(new.service_id, new.servant_id);
  end if;
  return new;
end;
$$;

create trigger points_ledger_achievements after insert on public.points_ledger
  for each row execute function public.achievements_after_activity();
create trigger competition_entries_achievements after insert on public.competition_entries
  for each row execute function public.achievements_after_activity();
create trigger visits_achievements after insert on public.visits
  for each row execute function public.achievements_after_activity();

-- A new or changed achievement is evaluated for everyone in the service.
create function public.achievements_after_definition()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  m record;
begin
  for m in
    select user_id from public.service_members
    where service_id = new.service_id and status = 'active' and role in ('served', 'servant')
  loop
    perform public.evaluate_achievements(new.service_id, m.user_id);
  end loop;
  return new;
end;
$$;

create trigger achievements_evaluate after insert or update of criteria on public.achievements
  for each row execute function public.achievements_after_definition();

-- Admins see how many members earned each achievement.
create function public.achievement_counts(p_service uuid)
returns table (achievement_id uuid, earned int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_service_admin(p_service) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select a.id, count(ua.id)::int
    from public.achievements a
    left join public.user_achievements ua on ua.achievement_id = a.id
    where a.service_id = p_service
    group by a.id;
end;
$$;

revoke execute on function
  public.available_points(uuid, uuid),
  public.my_available_points(uuid),
  public.redeem_gift(uuid),
  public.decide_redemption(uuid, public.redemption_status),
  public.achievement_progress(uuid, uuid, text),
  public.evaluate_achievements(uuid, uuid),
  public.achievements_after_activity(),
  public.achievements_after_definition(),
  public.achievement_counts(uuid)
from anon, authenticated, public;
grant execute on function
  public.my_available_points(uuid),
  public.redeem_gift(uuid),
  public.decide_redemption(uuid, public.redemption_status),
  public.achievement_counts(uuid)
to authenticated;

commit;
