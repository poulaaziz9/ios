-- Phase 2: Row Level Security.
-- RLS is enabled on every table and access is default-deny: anything without
-- a policy below is refused. Policies apply to `authenticated` only; `anon`
-- gets nothing. Writes that must carry side effects (ledger entries, grading,
-- joining) have no policy at all and go through SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.churches enable row level security;
alter table public.church_roles enable row level security;
alter table public.services enable row level security;
alter table public.classes enable row level security;
alter table public.service_members enable row level security;
alter table public.join_codes enable row level security;
alter table public.servant_assignments enable row level security;
alter table public.visits enable row level security;
alter table public.prep_sessions enable row level security;
alter table public.prep_attendance enable row level security;
alter table public.point_rules enable row level security;
alter table public.points_ledger enable row level security;
alter table public.posts enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_questions enable row level security;
alter table public.competition_entries enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_redemptions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- Belt and braces: anon has no business with any table.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Rows never move between parents
-- ---------------------------------------------------------------------------
create trigger services_fixed_parent before update on public.services
  for each row execute function public.forbid_parent_change('church_id');
create trigger church_roles_fixed_parent before update on public.church_roles
  for each row execute function public.forbid_parent_change('church_id', 'user_id', 'role');
create trigger classes_fixed_parent before update on public.classes
  for each row execute function public.forbid_parent_change('service_id');
create trigger service_members_fixed_parent before update on public.service_members
  for each row execute function public.forbid_parent_change('service_id', 'user_id', 'role');
create trigger join_codes_fixed_parent before update on public.join_codes
  for each row execute function public.forbid_parent_change('service_id');
create trigger servant_assignments_fixed_parent before update on public.servant_assignments
  for each row execute function public.forbid_parent_change('service_id');
create trigger prep_sessions_fixed_parent before update on public.prep_sessions
  for each row execute function public.forbid_parent_change('service_id');
create trigger point_rules_fixed_parent before update on public.point_rules
  for each row execute function public.forbid_parent_change('service_id', 'reason');
create trigger posts_fixed_parent before update on public.posts
  for each row execute function public.forbid_parent_change('service_id', 'author_id');
create trigger competitions_fixed_parent before update on public.competitions
  for each row execute function public.forbid_parent_change('service_id');
create trigger competition_questions_fixed_parent before update on public.competition_questions
  for each row execute function public.forbid_parent_change('competition_id');
create trigger gifts_fixed_parent before update on public.gifts
  for each row execute function public.forbid_parent_change('service_id');
create trigger gift_redemptions_fixed_parent before update on public.gift_redemptions
  for each row execute function public.forbid_parent_change('gift_id', 'user_id');
create trigger achievements_fixed_parent before update on public.achievements
  for each row execute function public.forbid_parent_change('service_id');

-- ---------------------------------------------------------------------------
-- profiles (phase 1 created own-row policies; widen read access now)
-- ---------------------------------------------------------------------------
-- Rewrite the phase-1 read policy in place (not remove + recreate, so hosted
-- Supabase applies it without a destructive-change confirmation).
alter policy "profiles: read own" on public.profiles rename to "profiles: read visible";
alter policy "profiles: read visible" on public.profiles
  using (public.can_see_profile(id));

-- Phone is personal data (mostly minors): not selectable through the table.
-- Use public.visible_phone(user_id) instead.
revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_url, is_super_admin, created_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- churches — super admin manages; connected users can read
-- ---------------------------------------------------------------------------
create policy "churches: read connected"
  on public.churches for select to authenticated
  using (public.can_see_church(id));
create policy "churches: super admin insert"
  on public.churches for insert to authenticated
  with check (public.is_super_admin());
create policy "churches: super admin update"
  on public.churches for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy "churches: super admin delete"
  on public.churches for delete to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- church_roles — super admin appoints church admins; church admins manage
-- the servants pool of their church
-- ---------------------------------------------------------------------------
create policy "church_roles: read own or admin"
  on public.church_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_church_admin(church_id));
create policy "church_roles: insert"
  on public.church_roles for insert to authenticated
  with check (
    case role
      when 'church_admin' then public.is_super_admin()
      else public.is_church_admin(church_id)
    end
  );
create policy "church_roles: delete"
  on public.church_roles for delete to authenticated
  using (
    case role
      when 'church_admin' then public.is_super_admin()
      else public.is_church_admin(church_id)
    end
  );

-- ---------------------------------------------------------------------------
-- services — church admin creates/deletes; service admin may edit details
-- ---------------------------------------------------------------------------
create policy "services: read members"
  on public.services for select to authenticated
  using (public.is_service_member(id) or public.is_service_admin(id));
create policy "services: church admin insert"
  on public.services for insert to authenticated
  with check (public.is_church_admin(church_id));
create policy "services: service admin update"
  on public.services for update to authenticated
  using (public.is_service_admin(id)) with check (public.is_service_admin(id));
create policy "services: church admin delete"
  on public.services for delete to authenticated
  using (public.is_church_admin(church_id));

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------
create policy "classes: read members"
  on public.classes for select to authenticated
  using (public.is_service_member(service_id) or public.is_service_admin(service_id));
create policy "classes: admin insert"
  on public.classes for insert to authenticated
  with check (public.is_service_admin(service_id));
create policy "classes: admin update"
  on public.classes for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "classes: admin delete"
  on public.classes for delete to authenticated
  using (public.is_service_admin(service_id));

-- ---------------------------------------------------------------------------
-- service_members
--   * served rows: service admin (kids normally join via join_with_code RPC)
--   * servant / service_admin rows: church admin only (spec 4.2)
--   * service admins may move members between classes and change status,
--     but cannot touch other service admins' rows
-- ---------------------------------------------------------------------------
create policy "service_members: read"
  on public.service_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_service_admin(service_id)
    or (status = 'active' and public.is_service_member(service_id))
  );
create policy "service_members: insert"
  on public.service_members for insert to authenticated
  with check (
    case role
      when 'served' then public.is_service_admin(service_id)
      else public.is_church_admin(public.service_church_id(service_id))
    end
  );
create policy "service_members: update"
  on public.service_members for update to authenticated
  using (
    public.is_service_admin(service_id)
    and (role <> 'service_admin' or public.is_church_admin(public.service_church_id(service_id)))
  )
  with check (
    public.is_service_admin(service_id)
    and (role <> 'service_admin' or public.is_church_admin(public.service_church_id(service_id)))
  );
create policy "service_members: delete"
  on public.service_members for delete to authenticated
  using (
    public.is_service_admin(service_id)
    and (role <> 'service_admin' or public.is_church_admin(public.service_church_id(service_id)))
  );

-- Only class and status are editable; role changes = remove + add.
revoke update on public.service_members from authenticated;
grant update (class_id, status) on public.service_members to authenticated;

-- ---------------------------------------------------------------------------
-- join_codes — service admin only (joining uses the join_with_code RPC)
-- ---------------------------------------------------------------------------
create policy "join_codes: admin all"
  on public.join_codes for all to authenticated
  using (public.is_service_admin(service_id))
  with check (public.is_service_admin(service_id));

-- ---------------------------------------------------------------------------
-- servant_assignments — admin assigns active served to active servants
-- ---------------------------------------------------------------------------
create policy "servant_assignments: read"
  on public.servant_assignments for select to authenticated
  using (servant_id = (select auth.uid()) or public.is_service_admin(service_id));
create policy "servant_assignments: admin insert"
  on public.servant_assignments for insert to authenticated
  with check (
    public.is_service_admin(service_id)
    and public.is_active_member(servant_id, service_id, 'servant')
    and public.is_active_member(served_id, service_id, 'served')
  );
create policy "servant_assignments: admin update"
  on public.servant_assignments for update to authenticated
  using (public.is_service_admin(service_id))
  with check (
    public.is_service_admin(service_id)
    and public.is_active_member(servant_id, service_id, 'servant')
    and public.is_active_member(served_id, service_id, 'served')
  );
create policy "servant_assignments: admin delete"
  on public.servant_assignments for delete to authenticated
  using (public.is_service_admin(service_id));

-- ---------------------------------------------------------------------------
-- visits — created only via log_visit RPC; admin can delete mistakes
-- ---------------------------------------------------------------------------
create policy "visits: read"
  on public.visits for select to authenticated
  using (servant_id = (select auth.uid()) or public.is_service_admin(service_id));
create policy "visits: admin delete"
  on public.visits for delete to authenticated
  using (public.is_service_admin(service_id));

-- ---------------------------------------------------------------------------
-- prep_sessions / prep_attendance (check-in via check_in_prep RPC)
-- ---------------------------------------------------------------------------
create policy "prep_sessions: read"
  on public.prep_sessions for select to authenticated
  using (public.is_service_admin(service_id) or public.has_service_role(service_id, 'servant'));
create policy "prep_sessions: admin insert"
  on public.prep_sessions for insert to authenticated
  with check (public.is_service_admin(service_id));
create policy "prep_sessions: admin update"
  on public.prep_sessions for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "prep_sessions: admin delete"
  on public.prep_sessions for delete to authenticated
  using (public.is_service_admin(service_id));

create policy "prep_attendance: read"
  on public.prep_attendance for select to authenticated
  using (
    servant_id = (select auth.uid())
    or public.is_service_admin(public.prep_session_service_id(session_id))
  );
create policy "prep_attendance: admin delete"
  on public.prep_attendance for delete to authenticated
  using (public.is_service_admin(public.prep_session_service_id(session_id)));

-- ---------------------------------------------------------------------------
-- point_rules / points_ledger
-- The ledger is append-only and has NO write policies: entries are created
-- only by SECURITY DEFINER RPCs. Corrections are new reversing entries.
-- ---------------------------------------------------------------------------
create policy "point_rules: read"
  on public.point_rules for select to authenticated
  using (public.is_service_member(service_id) or public.is_service_admin(service_id));
create policy "point_rules: admin insert"
  on public.point_rules for insert to authenticated
  with check (public.is_service_admin(service_id));
create policy "point_rules: admin update"
  on public.point_rules for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "point_rules: admin delete"
  on public.point_rules for delete to authenticated
  using (public.is_service_admin(service_id));

create policy "points_ledger: read own or admin"
  on public.points_ledger for select to authenticated
  using (user_id = (select auth.uid()) or public.is_service_admin(service_id));

revoke all on public.points_ledger from authenticated;
grant select on public.points_ledger to authenticated;

-- ---------------------------------------------------------------------------
-- posts — admins publish; members see service-wide posts and their class
-- ---------------------------------------------------------------------------
create policy "posts: read"
  on public.posts for select to authenticated
  using (public.can_see_class(service_id, class_id));
create policy "posts: admin insert"
  on public.posts for insert to authenticated
  with check (public.is_service_admin(service_id) and author_id = (select auth.uid()));
create policy "posts: admin update"
  on public.posts for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "posts: admin delete"
  on public.posts for delete to authenticated
  using (public.is_service_admin(service_id));

-- ---------------------------------------------------------------------------
-- competitions / questions / entries
-- correct_index is never selectable through the API (column grant); admins
-- read it with public.competition_answer_key(). Entries come from the
-- submit_competition RPC, which grades server-side.
-- ---------------------------------------------------------------------------
create policy "competitions: read"
  on public.competitions for select to authenticated
  using (public.can_see_competition(id));
create policy "competitions: admin insert"
  on public.competitions for insert to authenticated
  with check (public.is_service_admin(service_id));
create policy "competitions: admin update"
  on public.competitions for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "competitions: admin delete"
  on public.competitions for delete to authenticated
  using (public.is_service_admin(service_id));

create policy "competition_questions: read"
  on public.competition_questions for select to authenticated
  using (public.can_see_competition(competition_id));
create policy "competition_questions: admin insert"
  on public.competition_questions for insert to authenticated
  with check (public.is_service_admin(public.competition_service_id(competition_id)));
create policy "competition_questions: admin update"
  on public.competition_questions for update to authenticated
  using (public.is_service_admin(public.competition_service_id(competition_id)))
  with check (public.is_service_admin(public.competition_service_id(competition_id)));
create policy "competition_questions: admin delete"
  on public.competition_questions for delete to authenticated
  using (public.is_service_admin(public.competition_service_id(competition_id)));

revoke select on public.competition_questions from authenticated;
grant select (id, competition_id, question, options, points, sort_order, created_at)
  on public.competition_questions to authenticated;

create policy "competition_entries: read own or admin"
  on public.competition_entries for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_service_admin(public.competition_service_id(competition_id))
  );

-- ---------------------------------------------------------------------------
-- gifts / gift_redemptions (requests via redeem_gift RPC; admins decide)
-- ---------------------------------------------------------------------------
create policy "gifts: read"
  on public.gifts for select to authenticated
  using (
    public.is_service_admin(service_id)
    or (is_active and public.is_service_member(service_id))
  );
create policy "gifts: admin insert"
  on public.gifts for insert to authenticated
  with check (public.is_service_admin(service_id));
create policy "gifts: admin update"
  on public.gifts for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "gifts: admin delete"
  on public.gifts for delete to authenticated
  using (public.is_service_admin(service_id));

create policy "gift_redemptions: read own or admin"
  on public.gift_redemptions for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_service_admin(public.gift_service_id(gift_id))
  );

-- Status transitions that debit points go through an RPC (phase 8);
-- no direct client writes on redemptions.

-- ---------------------------------------------------------------------------
-- achievements / user_achievements (awarded by the achievements engine)
-- ---------------------------------------------------------------------------
create policy "achievements: read"
  on public.achievements for select to authenticated
  using (public.is_service_member(service_id) or public.is_service_admin(service_id));
create policy "achievements: admin insert"
  on public.achievements for insert to authenticated
  with check (public.is_service_admin(service_id));
create policy "achievements: admin update"
  on public.achievements for update to authenticated
  using (public.is_service_admin(service_id)) with check (public.is_service_admin(service_id));
create policy "achievements: admin delete"
  on public.achievements for delete to authenticated
  using (public.is_service_admin(service_id));

create policy "user_achievements: read own or admin"
  on public.user_achievements for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_service_admin(public.achievement_service_id(achievement_id))
  );
