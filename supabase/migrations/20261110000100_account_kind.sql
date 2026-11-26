-- At signup the user says whether they are a servant (خادم) or a served kid
-- (مخدوم). A servant's account can't join a class with a QR code (that would
-- make them a kid), and a church admin's phone lookup only finds servants.
-- It can be changed later from the profile.

create type public.account_kind as enum ('servant', 'served');

alter table public.profiles add column account_kind public.account_kind;
grant select (account_kind), update (account_kind) on public.profiles to authenticated;

-- Existing accounts: servants are anyone with a church or staff role; kids
-- are those who are only served. Platform admins are left alone.
update public.profiles p
set account_kind = case
  when exists (select 1 from public.church_roles cr where cr.user_id = p.id)
    or exists (select 1 from public.service_members sm
               where sm.user_id = p.id and sm.role in ('servant', 'service_admin') and sm.status <> 'removed')
    then 'servant'::public.account_kind
  when exists (select 1 from public.service_members sm where sm.user_id = p.id and sm.role = 'served')
    then 'served'::public.account_kind
end
where p.account_kind is null and not p.is_super_admin;

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
  insert into public.profiles (id, full_name, phone, church_id, account_kind)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    (select c.id from public.churches c where c.id = picked),
    case new.raw_user_meta_data ->> 'account_kind'
      when 'servant' then 'servant'::public.account_kind
      when 'served' then 'served'::public.account_kind
    end
  );
  return new;
end;
$$;

-- Church admins only find servants of their church (super admins: anyone).
create or replace function public.find_user_by_phone(p_phone text, p_church uuid)
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
      and (public.is_super_admin()
           or (p.church_id = p_church and p.account_kind is distinct from 'served'));
end;
$$;

create or replace function public.join_with_code(p_code text)
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
  -- A servant's account never joins as a kid (they ask the church admin).
  if exists (select 1 from public.profiles where id = v_uid and account_kind = 'servant') then
    raise exception 'servant_account';
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
