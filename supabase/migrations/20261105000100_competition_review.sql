-- A kid's corrected answer sheet after submitting a competition: each
-- question with the option they chose and whether it was right. The correct
-- option is revealed only once the competition has ended, so answers can't
-- be passed to kids who haven't solved it yet.
create function public.my_competition_review(p_competition uuid)
returns table (
  question_id uuid, question text, options jsonb, points int,
  my_answer int, is_correct boolean, correct_index int
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_comp public.competitions;
  v_answers jsonb;
begin
  select * into v_comp from public.competitions where id = p_competition;
  select e.answers into v_answers from public.competition_entries e
  where e.competition_id = p_competition and e.user_id = (select auth.uid());
  if v_comp.id is null or v_answers is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select q.id, q.question, q.options, q.points,
           case when jsonb_typeof(v_answers -> q.id::text) = 'number'
                then (v_answers ->> q.id::text)::numeric::int end,
           jsonb_typeof(v_answers -> q.id::text) = 'number'
             and (v_answers ->> q.id::text)::numeric = q.correct_index,
           case when v_comp.ends_at is not null and v_comp.ends_at <= now() then q.correct_index end
    from public.competition_questions q
    where q.competition_id = p_competition
    order by q.sort_order;
end;
$$;

revoke execute on function public.my_competition_review(uuid) from anon, public;
grant execute on function public.my_competition_review(uuid) to authenticated;
