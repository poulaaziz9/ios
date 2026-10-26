-- Phase 4: service admin core — join codes (one per class), joining, roster.
-- Decision (owner, phase 4): every join code belongs to a class. There is no
-- service-level code, so kids always join straight into a class as active.

delete from public.join_codes where class_id is null;
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
