-- RLS tests: each role can / can't read / write what it should.
-- Run with `npm run test:db` (supabase test db). Everything runs in one
-- transaction that is rolled back, so the seed data is untouched; all
-- assertions filter to the fixture rows created here.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ===========================================================================
-- Test helpers
-- ===========================================================================
create schema tests;
create table tests.ids (name text primary key, id uuid not null default gen_random_uuid());
grant usage on schema tests to anon, authenticated;
grant select, insert, update on tests.ids to anon, authenticated;

-- Fixture id by name (created on first use).
create function tests.uid(p_name text) returns uuid language sql as $$
  select id from tests.ids where name = p_name;
$$;
create function tests.new_id(p_name text) returns uuid language sql as $$
  insert into tests.ids (name) values (p_name) returning id;
$$;

create function tests.create_user(p_name text, p_phone text) returns uuid language plpgsql as $$
declare v uuid := tests.new_id(p_name);
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v, p_name || '@test.local', jsonb_build_object('full_name', p_name, 'phone', p_phone),
          'authenticated', 'authenticated');
  return v;
end $$;

-- Impersonate a user for the rest of the transaction (until `reset role`).
create function tests.as_user(p_name text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', tests.uid(p_name), 'role', 'authenticated')::text, true);
end $$;

-- Rows affected by an UPDATE/DELETE (RLS silently filters instead of erroring).
create function tests.affected(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute format('with x as (%s returning 1) select count(*)::int from x', p_sql) into n;
  return n;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ===========================================================================
-- Fixtures (as postgres)
--   church A: services A1 (classes a1x, a1y) and A2 (class a2x)
--   church B: service B1 (class b1x)
-- ===========================================================================
select tests.create_user('super', '+201090000001');
select tests.create_user('church_admin_a', '+201090000002');
select tests.create_user('church_admin_b', '+201090000003');
select tests.create_user('admin_a1', '+201090000004');
select tests.create_user('admin_a1_2', '+201090000005');
select tests.create_user('admin_a2', '+201090000006');
select tests.create_user('servant_x', '+201090000007');
select tests.create_user('servant_y', '+201090000008');
select tests.create_user('kid_x', '+201090000009');
select tests.create_user('kid_y', '+201090000010');
select tests.create_user('kid_pending', '+201090000011');
select tests.create_user('kid_b', '+201090000012');
select tests.create_user('outsider', '+201090000013');
update public.profiles set is_super_admin = true where id = tests.uid('super');

insert into public.churches (id, name) values
  (tests.new_id('church_a'), 'A'), (tests.new_id('church_b'), 'B');
insert into public.church_roles (church_id, user_id, role) values
  (tests.uid('church_a'), tests.uid('church_admin_a'), 'church_admin'),
  (tests.uid('church_b'), tests.uid('church_admin_b'), 'church_admin'),
  (tests.uid('church_a'), tests.uid('servant_x'), 'servant');

insert into public.services (id, church_id, name) values
  (tests.new_id('svc_a1'), tests.uid('church_a'), 'A1'),
  (tests.new_id('svc_a2'), tests.uid('church_a'), 'A2'),
  (tests.new_id('svc_b1'), tests.uid('church_b'), 'B1');
insert into public.classes (id, service_id, name) values
  (tests.new_id('class_a1x'), tests.uid('svc_a1'), 'a1x'),
  (tests.new_id('class_a1y'), tests.uid('svc_a1'), 'a1y'),
  (tests.new_id('class_a2x'), tests.uid('svc_a2'), 'a2x'),
  (tests.new_id('class_b1x'), tests.uid('svc_b1'), 'b1x');

insert into public.service_members (service_id, user_id, role, class_id, status) values
  (tests.uid('svc_a1'), tests.uid('admin_a1'), 'service_admin', null, 'active'),
  (tests.uid('svc_a1'), tests.uid('admin_a1_2'), 'service_admin', null, 'active'),
  (tests.uid('svc_a2'), tests.uid('admin_a2'), 'service_admin', null, 'active'),
  (tests.uid('svc_a1'), tests.uid('servant_x'), 'servant', tests.uid('class_a1x'), 'active'),
  (tests.uid('svc_a1'), tests.uid('servant_y'), 'servant', tests.uid('class_a1y'), 'active'),
  (tests.uid('svc_a1'), tests.uid('kid_x'), 'served', tests.uid('class_a1x'), 'active'),
  (tests.uid('svc_a1'), tests.uid('kid_y'), 'served', tests.uid('class_a1y'), 'active'),
  (tests.uid('svc_a1'), tests.uid('kid_pending'), 'served', null, 'pending'),
  (tests.uid('svc_b1'), tests.uid('kid_b'), 'served', tests.uid('class_b1x'), 'active');

insert into public.servant_assignments (service_id, servant_id, served_id) values
  (tests.uid('svc_a1'), tests.uid('servant_x'), tests.uid('kid_x')),
  (tests.uid('svc_a1'), tests.uid('servant_y'), tests.uid('kid_y'));

insert into public.join_codes (service_id, class_id, code) values
  (tests.uid('svc_a1'), tests.uid('class_a1x'), 'TESTA1X'),
  (tests.uid('svc_b1'), tests.uid('class_b1x'), 'TESTB1X');

insert into public.visits (service_id, servant_id, served_id, visit_type) values
  (tests.uid('svc_a1'), tests.uid('servant_x'), tests.uid('kid_x'), 'home'),
  (tests.uid('svc_a1'), tests.uid('servant_y'), tests.uid('kid_y'), 'call');

insert into public.prep_sessions (id, service_id, title, session_date) values
  (tests.new_id('prep_a1'), tests.uid('svc_a1'), 'prep', current_date);
insert into public.prep_attendance (session_id, servant_id) values
  (tests.uid('prep_a1'), tests.uid('servant_x'));

insert into public.point_rules (service_id, reason, points) values
  (tests.uid('svc_a1'), 'visit', 10);
insert into public.points_ledger (service_id, class_id, user_id, points, reason) values
  (tests.uid('svc_a1'), tests.uid('class_a1x'), tests.uid('kid_x'), 10, 'manual'),
  (tests.uid('svc_a1'), tests.uid('class_a1y'), tests.uid('kid_y'), 20, 'manual'),
  (tests.uid('svc_a1'), tests.uid('class_a1x'), tests.uid('servant_x'), 5, 'visit'),
  (tests.uid('svc_b1'), tests.uid('class_b1x'), tests.uid('kid_b'), 100, 'manual');

insert into public.posts (service_id, class_id, author_id, body) values
  (tests.uid('svc_a1'), null, tests.uid('admin_a1'), 'all'),
  (tests.uid('svc_a1'), tests.uid('class_a1x'), tests.uid('admin_a1'), 'a1x'),
  (tests.uid('svc_a1'), tests.uid('class_a1y'), tests.uid('admin_a1'), 'a1y'),
  (tests.uid('svc_b1'), null, tests.uid('church_admin_b'), 'b');

insert into public.competitions (id, service_id, title, starts_at, is_published) values
  (tests.new_id('comp_live'), tests.uid('svc_a1'), 'live', now() - interval '1 hour', true),
  (tests.new_id('comp_draft'), tests.uid('svc_a1'), 'draft', null, false),
  (tests.new_id('comp_future'), tests.uid('svc_a1'), 'future', now() + interval '1 day', true),
  (tests.new_id('comp_b'), tests.uid('svc_b1'), 'b', null, true);
insert into public.competition_questions (competition_id, question, options, correct_index) values
  (tests.uid('comp_live'), 'q1', '["a","b"]', 1),
  (tests.uid('comp_live'), 'q2', '["a","b","c"]', 2),
  (tests.uid('comp_draft'), 'q', '["a","b"]', 0),
  (tests.uid('comp_b'), 'q', '["a","b"]', 0);
insert into public.competition_entries (competition_id, user_id, answers, score) values
  (tests.uid('comp_live'), tests.uid('kid_x'), '[1,2]', 2),
  (tests.uid('comp_live'), tests.uid('kid_y'), '[0,0]', 0);

insert into public.gifts (id, service_id, name, cost_points, is_active) values
  (tests.new_id('gift_on'), tests.uid('svc_a1'), 'on', 10, true),
  (tests.new_id('gift_off'), tests.uid('svc_a1'), 'off', 10, false);
insert into public.gift_redemptions (gift_id, user_id) values
  (tests.uid('gift_on'), tests.uid('kid_x')),
  (tests.uid('gift_on'), tests.uid('kid_y'));

insert into public.achievements (id, service_id, name) values
  (tests.new_id('ach_a1'), tests.uid('svc_a1'), 'star');
insert into public.user_achievements (achievement_id, user_id) values
  (tests.uid('ach_a1'), tests.uid('kid_x')),
  (tests.uid('ach_a1'), tests.uid('kid_y'));

-- Scope every count to fixtures (the seed data also lives in this DB).
create view tests.my_services with (security_invoker = on) as
  select id from public.services where id in (tests.uid('svc_a1'), tests.uid('svc_a2'), tests.uid('svc_b1'));
grant select on tests.my_services to authenticated;

-- ===========================================================================
-- Structure: RLS on every public table
-- ===========================================================================
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'RLS is enabled on every public table');

-- ===========================================================================
-- anon
-- ===========================================================================
set local role anon;
select throws_ok('select * from public.services', '42501', null, 'anon: cannot read services');
select throws_ok('select * from public.profiles', '42501', null, 'anon: cannot read profiles');
select throws_ok('select * from public.v_service_leaderboard', '42501', null, 'anon: cannot read leaderboard');
reset role;

-- ===========================================================================
-- outsider (logged in, no memberships)
-- ===========================================================================
select tests.as_user('outsider');
select is((select count(*)::int from public.churches where id in (tests.uid('church_a'), tests.uid('church_b'))), 0, 'outsider: sees no churches');
select is((select count(*)::int from public.services), 0, 'outsider: sees no services');
select is((select count(*)::int from public.service_members), 0, 'outsider: sees no memberships');
select is((select count(*)::int from public.profiles), 1, 'outsider: sees only own profile');
select is((select count(*)::int from public.v_service_leaderboard), 0, 'outsider: leaderboard empty');
select is((select count(*)::int from public.posts), 0, 'outsider: sees no posts');
select ok(public.visible_phone(tests.uid('outsider')) is not null, 'outsider: can read own phone');
select is(public.visible_phone(tests.uid('kid_x')), null, 'outsider: cannot read a kid''s phone');
select throws_ok($$ insert into public.churches (name) values ('x') $$, '42501', null, 'outsider: cannot create church');
select throws_ok($$ select phone from public.profiles $$, '42501', null, 'outsider: phone column not selectable');
select throws_ok($$ update public.profiles set is_super_admin = true where id = tests.uid('outsider') $$,
  '42501', null, 'outsider: cannot make self super admin');
select throws_ok(
  format($$ insert into public.service_members (service_id, user_id, role, status) values (%L, %L, 'served', 'active') $$,
    tests.uid('svc_a1'), tests.uid('outsider')),
  '42501', null, 'outsider: cannot add self to a service');
reset role;

-- ===========================================================================
-- super admin
-- ===========================================================================
select tests.as_user('super');
select is((select count(*)::int from public.churches where id in (tests.uid('church_a'), tests.uid('church_b'))), 2, 'super: sees all churches');
select is((select count(*)::int from tests.my_services), 3, 'super: sees all services');
select lives_ok($$ insert into public.churches (name) values ('new church') $$, 'super: can create church');
select is(tests.affected(format($$ update public.churches set address = 'x' where id = %L $$, tests.uid('church_b'))), 1, 'super: can edit church');
select lives_ok(
  format($$ insert into public.church_roles (church_id, user_id, role) values (%L, %L, 'church_admin') $$,
    tests.uid('church_b'), tests.uid('outsider')),
  'super: can appoint church admin');
select ok(public.is_service_admin(tests.uid('svc_b1')), 'super: counts as service admin everywhere');
reset role;
delete from public.church_roles where user_id = tests.uid('outsider');

-- ===========================================================================
-- church admin (church A)
-- ===========================================================================
select tests.as_user('church_admin_a');
select is((select count(*)::int from public.churches where id in (tests.uid('church_a'), tests.uid('church_b'))), 1, 'church admin: sees only own church');
select is((select count(*)::int from tests.my_services), 2, 'church admin: sees both services of own church');
select ok(not exists (select 1 from public.services where id = tests.uid('svc_b1')), 'church admin: cannot see other church''s service');
select throws_ok($$ insert into public.churches (name) values ('x') $$, '42501', null, 'church admin: cannot create church');
select is(tests.affected(format($$ update public.churches set name = 'x' where id = %L $$, tests.uid('church_a'))), 0, 'church admin: cannot edit church');
select throws_ok(
  format($$ insert into public.church_roles (church_id, user_id, role) values (%L, %L, 'church_admin') $$,
    tests.uid('church_a'), tests.uid('outsider')),
  '42501', null, 'church admin: cannot appoint church admins');
select lives_ok(
  format($$ insert into public.church_roles (church_id, user_id, role) values (%L, %L, 'servant') $$,
    tests.uid('church_a'), tests.uid('outsider')),
  'church admin: can add to servants pool of own church');
select throws_ok(
  format($$ insert into public.church_roles (church_id, user_id, role) values (%L, %L, 'servant') $$,
    tests.uid('church_b'), tests.uid('outsider')),
  '42501', null, 'church admin: cannot add servants in other church');
select lives_ok(
  format($$ insert into public.services (church_id, name) values (%L, 'new') $$, tests.uid('church_a')),
  'church admin: can create service in own church');
select throws_ok(
  format($$ insert into public.services (church_id, name) values (%L, 'new') $$, tests.uid('church_b')),
  '42501', null, 'church admin: cannot create service in other church');
select throws_ok(
  format($$ update public.services set church_id = %L where id = %L $$, tests.uid('church_b'), tests.uid('svc_a2')),
  '42501', null, 'church admin: cannot move a service to another church');
select lives_ok(
  format($$ insert into public.service_members (service_id, user_id, role, class_id) values (%L, %L, 'servant', %L) $$,
    tests.uid('svc_a2'), tests.uid('servant_x'), tests.uid('class_a2x')),
  'church admin: can add a servant to a second service');
select lives_ok(
  format($$ insert into public.service_members (service_id, user_id, role) values (%L, %L, 'service_admin') $$,
    tests.uid('svc_a2'), tests.uid('outsider')),
  'church admin: can appoint service admin');
select throws_ok(
  format($$ insert into public.service_members (service_id, user_id, role) values (%L, %L, 'servant') $$,
    tests.uid('svc_b1'), tests.uid('outsider')),
  '42501', null, 'church admin: cannot add servant to other church''s service');
select ok(exists (select 1 from public.profiles where id = tests.uid('kid_x')), 'church admin: sees kids in own church');
select ok(not exists (select 1 from public.profiles where id = tests.uid('kid_b')), 'church admin: cannot see kids of other church');
select ok(public.visible_phone(tests.uid('kid_x')) is not null, 'church admin: can read phone of own church kid');
select is(public.visible_phone(tests.uid('kid_b')), null, 'church admin: cannot read phone of other church kid');
select is((select count(*)::int from public.points_ledger where service_id = tests.uid('svc_b1')), 0, 'church admin: no ledger from other church');
reset role;

-- ===========================================================================
-- service admin (service A1)
-- ===========================================================================
select tests.as_user('admin_a1');
select is((select count(*)::int from tests.my_services), 1, 'service admin: sees only own service');
select ok(not exists (select 1 from public.services where id = tests.uid('svc_a2')), 'service admin: no access to sibling service in same church');
select is((select count(*)::int from public.classes where service_id in (select id from tests.my_services)), 2, 'service admin: sees own classes only');
select lives_ok(
  format($$ insert into public.classes (service_id, name) values (%L, 'new') $$, tests.uid('svc_a1')),
  'service admin: can create class');
select throws_ok(
  format($$ insert into public.classes (service_id, name) values (%L, 'new') $$, tests.uid('svc_a2')),
  '42501', null, 'service admin: cannot create class in other service');
select throws_ok(
  format($$ update public.classes set service_id = %L where id = %L $$, tests.uid('svc_a2'), tests.uid('class_a1x')),
  '42501', null, 'service admin: cannot move class to another service');
select is(tests.affected(format($$ update public.services set name = 'renamed' where id = %L $$, tests.uid('svc_a1'))), 1, 'service admin: can edit own service details');
select is(tests.affected(format($$ delete from public.services where id = %L $$, tests.uid('svc_a1'))), 0, 'service admin: cannot delete own service');
select is((select count(*)::int from public.service_members where service_id = tests.uid('svc_a1')), 7, 'service admin: sees all members incl. pending');
select is(
  tests.affected(format($$ update public.service_members set class_id = %L where user_id = %L and service_id = %L $$,
    tests.uid('class_a1y'), tests.uid('kid_x'), tests.uid('svc_a1'))),
  1, 'service admin: can move kid between classes');
select throws_ok(
  format($$ update public.service_members set class_id = %L where user_id = %L $$, tests.uid('class_a2x'), tests.uid('kid_x')),
  '23503', null, 'service admin: cannot move kid into a class of another service');
select is(
  tests.affected(format($$ update public.service_members set status = 'active', class_id = %L where user_id = %L $$,
    tests.uid('class_a1x'), tests.uid('kid_pending'))),
  1, 'service admin: can approve pending member');
select throws_ok(
  format($$ update public.service_members set role = 'service_admin' where user_id = %L $$, tests.uid('kid_x')),
  '42501', null, 'service admin: cannot change a member''s role');
select is(
  tests.affected(format($$ update public.service_members set status = 'removed' where user_id = %L and service_id = %L $$,
    tests.uid('admin_a1_2'), tests.uid('svc_a1'))),
  0, 'service admin: cannot remove a fellow service admin');
select throws_ok(
  format($$ insert into public.service_members (service_id, user_id, role) values (%L, %L, 'servant') $$,
    tests.uid('svc_a1'), tests.uid('outsider')),
  '42501', null, 'service admin: cannot add servants (church admin does)');
select lives_ok(
  format($$ insert into public.service_members (service_id, user_id, role, class_id) values (%L, %L, 'served', %L) $$,
    tests.uid('svc_a1'), tests.uid('outsider'), tests.uid('class_a1x')),
  'service admin: can add a served member');
select is(
  tests.affected(format($$ update public.service_members set status = 'removed' where user_id = %L and service_id = %L $$,
    tests.uid('kid_b'), tests.uid('svc_b1'))),
  0, 'service admin: cannot touch other service''s members');
select lives_ok(
  format($$ insert into public.servant_assignments (service_id, servant_id, served_id) values (%L, %L, %L) $$,
    tests.uid('svc_a1'), tests.uid('servant_x'), tests.uid('outsider')),
  'service admin: can assign served to servant');
select throws_ok(
  format($$ insert into public.servant_assignments (service_id, servant_id, served_id) values (%L, %L, %L) $$,
    tests.uid('svc_a1'), tests.uid('kid_y'), tests.uid('kid_pending')),
  '42501', null, 'service admin: assignment requires an active servant');
select throws_ok(
  format($$ insert into public.servant_assignments (service_id, servant_id, served_id) values (%L, %L, %L) $$,
    tests.uid('svc_a1'), tests.uid('servant_x'), tests.uid('kid_b')),
  '42501', null, 'service admin: cannot assign a kid from another service');
select is((select count(*)::int from public.join_codes where service_id in (tests.uid('svc_a1'), tests.uid('svc_b1'))), 1, 'service admin: sees own join codes only');
select lives_ok(
  format($$ insert into public.join_codes (service_id, class_id, code) values (%L, %L, 'NEWCODE1') $$,
    tests.uid('svc_a1'), tests.uid('class_a1y')),
  'service admin: can create join code');
select throws_ok(
  format($$ insert into public.join_codes (service_id, code) values (%L, 'NEWCODE2') $$, tests.uid('svc_a2')),
  '42501', null, 'service admin: cannot create join code for other service');
select is((select count(*)::int from public.points_ledger where service_id in (select id from tests.my_services)), 3, 'service admin: sees whole ledger of own service');
select throws_ok(
  format($$ insert into public.points_ledger (service_id, user_id, points, reason) values (%L, %L, 1000, 'manual') $$,
    tests.uid('svc_a1'), tests.uid('kid_x')),
  '42501', null, 'service admin: cannot write ledger directly');
select throws_ok(
  format($$ delete from public.points_ledger where service_id = %L $$, tests.uid('svc_a1')),
  '42501', null, 'service admin: cannot delete ledger entries');
select lives_ok(
  format($$ insert into public.point_rules (service_id, reason, points) values (%L, 'preparation', 15) $$, tests.uid('svc_a1')),
  'service admin: can set point rules');
select throws_ok('select correct_index from public.competition_questions', '42501', null,
  'service admin: correct_index not selectable via table');
select is((select count(*)::int from public.competition_answer_key(tests.uid('comp_live'))), 2, 'service admin: can read answer key via RPC');
select throws_ok(format('select * from public.competition_answer_key(%L)', tests.uid('comp_b')), '42501', null,
  'service admin: cannot read other service''s answer key');
select is((select count(*)::int from public.competitions where service_id = tests.uid('svc_a1')), 3, 'service admin: sees drafts and scheduled competitions');
select lives_ok(
  format($$ insert into public.posts (service_id, author_id, body) values (%L, %L, 'hi') $$, tests.uid('svc_a1'), tests.uid('admin_a1')),
  'service admin: can publish post');
select throws_ok(
  format($$ insert into public.posts (service_id, author_id, body) values (%L, %L, 'hi') $$, tests.uid('svc_a1'), tests.uid('servant_x')),
  '42501', null, 'service admin: cannot post as someone else');
select is((select count(*)::int from public.gifts where service_id = tests.uid('svc_a1')), 2, 'service admin: sees inactive gifts too');
select is((select count(*)::int from public.visits where service_id in (select id from tests.my_services)), 2, 'service admin: sees all visits');
select is((select count(*)::int from public.prep_attendance), 1, 'service admin: sees prep attendance');
select ok(public.visible_phone(tests.uid('kid_x')) is not null, 'service admin: can read own kid''s phone');
select is(public.visible_phone(tests.uid('kid_b')), null, 'service admin: cannot read other service kid''s phone');
reset role;

-- Restore fixtures changed above.
update public.service_members set class_id = tests.uid('class_a1x') where user_id = tests.uid('kid_x');
update public.service_members set status = 'pending', class_id = null where user_id = tests.uid('kid_pending');
delete from public.service_members where user_id = tests.uid('outsider');
delete from public.servant_assignments where served_id = tests.uid('outsider');
delete from public.posts where body = 'hi';
delete from public.point_rules where service_id = tests.uid('svc_a1') and reason = 'preparation';

-- ===========================================================================
-- servant (A1, class a1x, assigned to kid_x)
-- ===========================================================================
select tests.as_user('servant_x');
select is((select count(*)::int from tests.my_services), 2, 'servant: sees services they serve in (A1 + A2)');
select is((select count(*)::int from public.servant_assignments), 1, 'servant: sees only own assignments');
select is((select count(*)::int from public.visits), 1, 'servant: sees only own visits');
select ok(public.visible_phone(tests.uid('kid_x')) is not null, 'servant: can read assigned kid''s phone');
select is(public.visible_phone(tests.uid('kid_y')), null, 'servant: cannot read unassigned kid''s phone');
select ok(exists (select 1 from public.profiles where id = tests.uid('kid_y')), 'servant: sees names of fellow members');
select throws_ok(
  format($$ insert into public.visits (service_id, servant_id, served_id, visit_type) values (%L, %L, %L, 'home') $$,
    tests.uid('svc_a1'), tests.uid('servant_x'), tests.uid('kid_x')),
  '42501', null, 'servant: visits only via RPC');
select throws_ok(
  format($$ insert into public.classes (service_id, name) values (%L, 'x') $$, tests.uid('svc_a1')),
  '42501', null, 'servant: cannot create class');
select is(
  tests.affected(format($$ update public.service_members set class_id = %L where user_id = %L $$, tests.uid('class_a1y'), tests.uid('kid_x'))),
  0, 'servant: cannot move members');
select is((select count(*)::int from public.points_ledger where service_id = tests.uid('svc_a1')), 1, 'servant: sees only own ledger entries');
select is((select count(*)::int from public.prep_sessions where service_id = tests.uid('svc_a1')), 1, 'servant: sees prep sessions');
select is((select count(*)::int from public.posts where service_id = tests.uid('svc_a1')), 3, 'servant: sees all posts of the service');
select is((select count(*)::int from public.join_codes), 0, 'servant: cannot see join codes');
select is((select count(*)::int from public.competitions where service_id = tests.uid('svc_a1')), 1, 'servant: sees only live published competitions');
select is((select count(*)::int from public.v_service_leaderboard where service_id = tests.uid('svc_a1') and role = 'servant'), 2, 'servant: servants leaderboard');
reset role;

-- ===========================================================================
-- served kid (A1, class a1x)
-- ===========================================================================
select tests.as_user('kid_x');
select is((select count(*)::int from tests.my_services), 1, 'served: sees own service only');
select ok(not exists (select 1 from public.service_members where user_id = tests.uid('kid_pending')), 'served: cannot see pending members');
select ok(not exists (select 1 from public.profiles where id = tests.uid('kid_b')), 'served: cannot see kids of other services');
select is(public.visible_phone(tests.uid('kid_y')), null, 'served: cannot read classmates'' phones');
select is(public.visible_phone(tests.uid('servant_x')), null, 'served: cannot read servant''s phone');
select is((select count(*)::int from public.posts), 2, 'served: sees service-wide + own class posts only');
select is((select count(*)::int from public.competitions), 1, 'served: sees only live published competitions');
select is((select count(*)::int from public.competition_questions where competition_id = tests.uid('comp_live')), 2, 'served: sees live questions');
select is((select count(*)::int from public.competition_questions where competition_id = tests.uid('comp_draft')), 0, 'served: cannot see draft questions');
select throws_ok('select correct_index from public.competition_questions', '42501', null, 'served: correct_index never readable');
select throws_ok(format('select * from public.competition_answer_key(%L)', tests.uid('comp_live')), '42501', null, 'served: no answer key');
select is((select count(*)::int from public.competition_entries), 1, 'served: sees only own entries');
select throws_ok(
  format($$ insert into public.competition_entries (competition_id, user_id, score) values (%L, %L, 999) $$,
    tests.uid('comp_future'), tests.uid('kid_x')),
  '42501', null, 'served: cannot self-grade competitions');
select is((select count(*)::int from public.points_ledger), 1, 'served: sees only own ledger');
select is(
  (select array_agg(full_name order by rank) from public.v_service_leaderboard where service_id = tests.uid('svc_a1') and role = 'served'),
  array['kid_y', 'kid_x'], 'served: service leaderboard ranks served members');
select is((select count(*)::int from public.v_service_leaderboard where service_id = tests.uid('svc_b1')), 0, 'served: no leaderboard of other services');
select is(
  (select total_points from public.v_class_leaderboard where class_id = tests.uid('class_a1x') and user_id = tests.uid('kid_x')),
  10, 'served: class leaderboard total');
select is((select count(*)::int from public.prep_sessions), 0, 'served: cannot see prep sessions');
select is((select count(*)::int from public.visits), 0, 'served: cannot see visits');
select is((select count(*)::int from public.servant_assignments), 0, 'served: cannot see assignments');
select is(
  tests.affected(format($$ update public.service_members set class_id = %L where user_id = %L $$, tests.uid('class_a1y'), tests.uid('kid_x'))),
  0, 'served: cannot change own class');
select is((select count(*)::int from public.gifts), 1, 'served: sees active gifts only');
select is((select count(*)::int from public.gift_redemptions), 1, 'served: sees own redemptions only');
select throws_ok(
  format($$ insert into public.gift_redemptions (gift_id, user_id) values (%L, %L) $$, tests.uid('gift_on'), tests.uid('kid_x')),
  '42501', null, 'served: redemptions only via RPC');
select is((select count(*)::int from public.user_achievements), 1, 'served: sees own achievements only');
select is((select count(*)::int from public.achievements), 1, 'served: sees achievement definitions');
select is((select count(*)::int from public.point_rules), 1, 'served: can read point rules');
reset role;

-- ===========================================================================
-- pending kid (joined via service-level code, not yet approved)
-- ===========================================================================
select tests.as_user('kid_pending');
select is((select count(*)::int from public.service_members), 1, 'pending: sees own membership row');
select is((select count(*)::int from tests.my_services), 0, 'pending: no access to service content yet');
select is((select count(*)::int from public.posts), 0, 'pending: sees no posts');
reset role;

-- ===========================================================================
-- Storage
-- ===========================================================================
select tests.as_user('kid_x');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('avatars', %L) $$, tests.uid('kid_x') || '/me.png'),
  'storage: user can upload own avatar');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('avatars', %L) $$, tests.uid('kid_y') || '/me.png'),
  '42501', null, 'storage: cannot upload into someone else''s avatar folder');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('service-media', %L) $$, tests.uid('svc_a1') || '/x.png'),
  '42501', null, 'storage: served cannot upload service media');
reset role;
select tests.as_user('admin_a1');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('service-media', %L) $$, tests.uid('svc_a1') || '/post.png'),
  'storage: service admin can upload service media');
reset role;
select tests.as_user('kid_y');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars' and name like tests.uid('kid_x') || '/%'), 1, 'storage: member sees fellow member''s avatar');
select is((select count(*)::int from storage.objects where bucket_id = 'service-media' and name like tests.uid('svc_a1') || '/%'), 1, 'storage: member sees service media');
reset role;
select tests.as_user('kid_b');
select is((select count(*)::int from storage.objects where name like tests.uid('kid_x') || '/%' or name like tests.uid('svc_a1') || '/%'), 0, 'storage: other service sees nothing');
reset role;

-- ===========================================================================
-- Phase 3 RPCs: finding users, managing servants
-- ===========================================================================
select tests.as_user('super');
select ok((select count(*) from public.search_users('kid')) >= 4, 'search_users: super admin finds by name');
select is((select full_name from public.search_users('90000013')), 'outsider', 'search_users: super admin finds by phone digits');
select is((select count(*)::int from public.search_users('k')), 0, 'search_users: ignores 1-char queries');
reset role;

select tests.as_user('church_admin_a');
select throws_ok($$ select * from public.search_users('kid') $$, '42501', null, 'search_users: church admin cannot browse users');
select is((select full_name from public.find_user_by_phone('+201090000013')), 'outsider', 'find_user_by_phone: church admin exact lookup');
select is((select count(*)::int from public.find_user_by_phone('+2010900000')), 0, 'find_user_by_phone: no partial matches');
select is(
  (select cardinality(service_ids) from public.church_servants(tests.uid('church_a')) where user_id = tests.uid('servant_x')),
  2, 'church_servants: lists services per servant');
select is(
  (select in_pool from public.church_servants(tests.uid('church_a')) where user_id = tests.uid('servant_y')),
  false, 'church_servants: includes servants not in the pool');
select throws_ok(format('select * from public.church_servants(%L)', tests.uid('church_b')), '42501', null,
  'church_servants: not for other churches');
select throws_ok(format('select * from public.church_admins(%L)', tests.uid('church_b')), '42501', null,
  'church_admins: not for other churches');
select lives_ok(
  format('select public.set_servant_services(%L, %L, array[%L]::uuid[])', tests.uid('church_a'), tests.uid('servant_x'), tests.uid('svc_a1')),
  'set_servant_services: church admin narrows a servant to one service');
select is(
  (select count(*)::int from public.service_members where user_id = tests.uid('servant_x') and role = 'servant'),
  1, 'set_servant_services: other memberships removed');
select lives_ok(
  format('select public.set_servant_services(%L, %L, array[%L, %L]::uuid[])',
    tests.uid('church_a'), tests.uid('kid_b'), tests.uid('svc_a1'), tests.uid('svc_a2')),
  'set_servant_services: any existing user can become a servant');
select ok(exists (select 1 from public.church_roles where user_id = tests.uid('kid_b') and role = 'servant'),
  'set_servant_services: adds to the church pool');
select throws_ok(
  format('select public.set_servant_services(%L, %L, array[%L]::uuid[])', tests.uid('church_a'), tests.uid('outsider'), tests.uid('svc_b1')),
  '42501', null, 'set_servant_services: cannot use a service of another church');
select throws_ok(
  format('select public.set_servant_services(%L, %L, array[]::uuid[])', tests.uid('church_b'), tests.uid('outsider')),
  '42501', null, 'set_servant_services: not for other churches');
select lives_ok(
  format('select public.remove_church_servant(%L, %L)', tests.uid('church_a'), tests.uid('servant_y')),
  'remove_church_servant: church admin removes a servant');
reset role;
select is((select count(*)::int from public.service_members where user_id = tests.uid('servant_y')), 0, 'remove_church_servant: memberships gone');
select is((select count(*)::int from public.servant_assignments where servant_id = tests.uid('servant_y')), 0, 'trigger: removed servant loses assignments');
update public.service_members set status = 'removed' where user_id = tests.uid('kid_x');
select is((select count(*)::int from public.servant_assignments where served_id = tests.uid('kid_x')), 0, 'trigger: deactivated kid loses assignment');

select tests.as_user('admin_a1');
select throws_ok($$ select * from public.find_user_by_phone('+201090000013') $$, '42501', null, 'find_user_by_phone: not for service admins');
select throws_ok(
  format('select public.set_servant_services(%L, %L, array[]::uuid[])', tests.uid('church_a'), tests.uid('outsider')),
  '42501', null, 'set_servant_services: not for service admins');
reset role;
select tests.as_user('outsider');
select throws_ok($$ select * from public.find_user_by_phone('+201090000001') $$, '42501', null, 'find_user_by_phone: not for regular users');
reset role;

-- ===========================================================================
-- Phase 4: join codes, joining, roster
-- ===========================================================================
select throws_ok(
  format($$ insert into public.join_codes (service_id, class_id) values (%L, null) $$, tests.uid('svc_a1')),
  '23502', null, 'join_codes: every code belongs to a class');

select tests.as_user('admin_a1');
select matches((select code from public.create_join_code(tests.uid('class_a1y'))), '^[A-Z2-9]{6}$', 'create_join_code: generates a 6-char code');
select ok(
  (select expires_at > now() from public.create_join_code(tests.uid('class_a1y'), current_date)),
  'create_join_code: expiry is end of the chosen day');
select throws_ok(format('select public.create_join_code(%L)', tests.uid('class_a2x')), '42501', null,
  'create_join_code: not for other services');
select isnt(
  public.regenerate_join_code((select id from public.join_codes where code = 'TESTA1X')),
  'TESTA1X', 'regenerate_join_code: issues a new code');
reset role;
-- Put the fixture code back for the join tests below.
update public.join_codes set code = 'TESTA1X' where service_id = tests.uid('svc_a1') and class_id = tests.uid('class_a1x');

select tests.as_user('kid_y');
select throws_ok(
  format('select public.regenerate_join_code(%L)', (select id from public.join_codes where code = 'TESTA1X')),
  '42501', null, 'regenerate_join_code: not for members');
select throws_ok(format('select * from public.service_roster(%L)', tests.uid('svc_a1')), '42501', null,
  'service_roster: admins only');
reset role;
select tests.as_user('admin_a1');
select ok(
  (select phone is not null from public.service_roster(tests.uid('svc_a1')) where user_id = tests.uid('kid_y')),
  'service_roster: admin gets phones');
reset role;

select tests.create_user('newkid', '+201090000099');
select tests.as_user('newkid');
select is((select class_name from public.join_code_preview(' testa1x ')), 'a1x', 'join_code_preview: case/space-insensitive');
select is((select count(*)::int from public.join_code_preview('NOPE99')), 0, 'join_code_preview: unknown code → no row');
select is(public.join_with_code('testa1x'), tests.uid('svc_a1'), 'join_with_code: returns the service');
select is(
  (select row(class_id, status)::text from public.service_members where user_id = tests.uid('newkid')),
  row(tests.uid('class_a1x'), 'active'::public.member_status)::text,
  'join_with_code: joins the code''s class as active');
select lives_ok($$ select public.join_with_code('TESTA1X') $$, 'join_with_code: joining twice is harmless');
select is((select count(*)::int from public.service_members where user_id = tests.uid('newkid')), 1, 'join_with_code: no duplicate membership');
select ok((select already_member from public.join_code_preview('TESTA1X')), 'join_code_preview: knows you already joined');
select throws_ok($$ select public.join_with_code('NOPE99') $$, 'P0001', 'invalid_code', 'join_with_code: unknown code');
reset role;
update public.join_codes set is_active = false where code = 'TESTB1X';
update public.join_codes set expires_at = now() - interval '1 minute' where code = 'TESTA1X';
select tests.as_user('newkid');
select throws_ok($$ select public.join_with_code('TESTB1X') $$, 'P0001', 'invalid_code', 'join_with_code: inactive code');
reset role;
select tests.as_user('outsider');
select throws_ok($$ select public.join_with_code('TESTA1X') $$, 'P0001', 'invalid_code', 'join_with_code: expired code');
reset role;
update public.join_codes set expires_at = null where code = 'TESTA1X';
select tests.as_user('kid_x'); -- removed earlier in the phase 3 section
select throws_ok($$ select public.join_with_code('TESTA1X') $$, 'P0001', 'removed', 'join_with_code: removed kid cannot rejoin alone');
reset role;
select tests.as_user('servant_x');
select throws_ok($$ select public.join_with_code('TESTA1X') $$, 'P0001', 'staff', 'join_with_code: servants do not join as served');
reset role;
set local role anon;
select throws_ok($$ select public.join_with_code('TESTA1X') $$, '42501', null, 'join_with_code: anon cannot join');
reset role;

-- ===========================================================================
-- Phase 5: points
-- ===========================================================================
select tests.as_user('admin_a1');
select tests.new_id('award1');
update tests.ids set id = public.award_points(tests.uid('svc_a1'), tests.uid('kid_y'), 15, 'manual', 'حفظ')
  where name = 'award1';
select is(
  (select row(class_id, points, created_by)::text from public.points_ledger where id = tests.uid('award1')),
  row(tests.uid('class_a1y'), 15, tests.uid('admin_a1'))::text,
  'award_points: entry attributed to member''s class and admin');
select throws_ok(format('select public.award_points(%L, %L, 5)', tests.uid('svc_a1'), tests.uid('outsider')),
  '22023', 'not a member', 'award_points: only members of the service');
select throws_ok(format('select public.award_points(%L, %L, 0)', tests.uid('svc_a1'), tests.uid('kid_y')),
  '22023', null, 'award_points: zero not allowed');
select throws_ok(format($$select public.award_points(%L, %L, 5, 'visit')$$, tests.uid('svc_a1'), tests.uid('kid_y')),
  '22023', 'reason not allowed', 'award_points: visit points only via log_visit');
select throws_ok(format('select public.award_points(%L, %L, 5)', tests.uid('svc_b1'), tests.uid('kid_b')),
  '42501', null, 'award_points: not in other services');
select is(
  public.award_points_many(tests.uid('svc_a1'), array[tests.uid('kid_y'), tests.uid('newkid')], 5),
  2, 'award_points_many: awards each member');
select lives_ok(format('select public.reverse_points(%L)', tests.uid('award1')), 'reverse_points: admin corrects an entry');
select is(
  (select points from public.points_ledger where source_id = tests.uid('award1')),
  -15, 'reverse_points: equal and opposite entry');
select throws_ok(format('select public.reverse_points(%L)', tests.uid('award1')), '23505', null,
  'reverse_points: only once');
select throws_ok(
  format('select public.reverse_points(%L)', (select id from public.points_ledger where source_id = tests.uid('award1'))),
  '22023', null, 'reverse_points: a correction cannot be reversed');
reset role;

select tests.as_user('kid_y');
select is((select service_total from public.my_points(tests.uid('svc_a1'))), 25, 'my_points: service total (20 + 15 + 5 − 15)');
select is((select class_total from public.my_points(tests.uid('svc_a1'))), 25, 'my_points: class total');
select throws_ok(format('select public.award_points(%L, %L, 100)', tests.uid('svc_a1'), tests.uid('kid_y')),
  '42501', null, 'award_points: kids cannot award themselves');
select throws_ok(
  format($$select public.ledger_add(%L, %L, 100, 'manual')$$, tests.uid('svc_a1'), tests.uid('kid_y')),
  '42501', null, 'ledger_add: internal, not callable');
reset role;

-- ===========================================================================
-- Cascade: super admin deletes a church with everything under it
-- ===========================================================================
select tests.as_user('super');
select is(tests.affected(format($$ delete from public.churches where id = %L $$, tests.uid('church_b'))), 1, 'super: can delete church');
reset role;
select is((select count(*)::int from public.points_ledger where service_id = tests.uid('svc_b1')), 0, 'cascade: church delete removes its ledger');

select * from finish();
rollback;
