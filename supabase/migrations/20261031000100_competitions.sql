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
