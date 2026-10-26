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
