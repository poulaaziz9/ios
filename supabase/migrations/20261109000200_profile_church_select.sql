-- The church picked at signup is readable like the rest of a visible profile
-- (profiles use column grants so the phone stays hidden).
grant select (church_id) on public.profiles to authenticated;
