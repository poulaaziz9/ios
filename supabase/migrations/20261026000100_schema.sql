-- Phase 2: core schema.
-- Conventions:
--   * UUID PKs, created_at on every table.
--   * Child rows that reference a class also carry service_id, and a composite
--     FK (class_id, service_id) -> classes(id, service_id) guarantees the class
--     belongs to the same service. Same idea for other cross-references.
--   * Deleting a church cascades to everything under it.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('service_admin', 'servant', 'served');
create type public.member_status as enum ('pending', 'active', 'removed');
create type public.church_role as enum ('church_admin', 'servant');
create type public.point_reason as enum (
  'competition', 'visit', 'preparation', 'attendance', 'manual', 'gift_redemption', 'achievement'
);
create type public.visit_type as enum ('home', 'call', 'message', 'other');
create type public.redemption_status as enum ('requested', 'approved', 'delivered', 'rejected');

-- ---------------------------------------------------------------------------
-- Hierarchy
-- ---------------------------------------------------------------------------
create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.church_roles (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.church_role not null,
  created_at timestamptz not null default now(),
  unique (church_id, user_id, role)
);
create index church_roles_user_idx on public.church_roles (user_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  logo_url text,
  created_at timestamptz not null default now()
);
create index services_church_idx on public.services (church_id);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, service_id)
);
create index classes_service_idx on public.classes (service_id, sort_order);

create table public.service_members (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  class_id uuid,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (service_id, user_id, role),
  foreign key (class_id, service_id) references public.classes (id, service_id) on delete set null (class_id)
);
create index service_members_user_idx on public.service_members (user_id);
create index service_members_class_idx on public.service_members (class_id);

create table public.join_codes (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  class_id uuid,
  code text not null unique check (code ~ '^[A-Z0-9]{4,16}$'),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (class_id, service_id) references public.classes (id, service_id) on delete cascade
);
create index join_codes_service_idx on public.join_codes (service_id);

-- ---------------------------------------------------------------------------
-- Visitation (افتقاد) and preparation (تحضير)
-- ---------------------------------------------------------------------------
create table public.servant_assignments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  servant_id uuid not null references public.profiles (id) on delete cascade,
  served_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (service_id, served_id),
  check (servant_id <> served_id)
);
create index servant_assignments_servant_idx on public.servant_assignments (service_id, servant_id);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  servant_id uuid not null references public.profiles (id) on delete cascade,
  served_id uuid not null references public.profiles (id) on delete cascade,
  visit_type public.visit_type not null,
  visited_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index visits_service_idx on public.visits (service_id, visited_at desc);
create index visits_served_idx on public.visits (served_id, visited_at desc);
create index visits_servant_idx on public.visits (servant_id, visited_at desc);

create table public.prep_sessions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  session_date date not null,
  created_at timestamptz not null default now()
);
create index prep_sessions_service_idx on public.prep_sessions (service_id, session_date desc);

create table public.prep_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.prep_sessions (id) on delete cascade,
  servant_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, servant_id)
);
create index prep_attendance_servant_idx on public.prep_attendance (servant_id);

-- ---------------------------------------------------------------------------
-- Points (append-only ledger; balances are always computed)
-- ---------------------------------------------------------------------------
create table public.point_rules (
  service_id uuid not null references public.services (id) on delete cascade,
  reason public.point_reason not null,
  points int not null,
  created_at timestamptz not null default now(),
  primary key (service_id, reason)
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  class_id uuid,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null check (points <> 0),
  reason public.point_reason not null,
  source_id uuid,
  note text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (class_id, service_id) references public.classes (id, service_id) on delete set null (class_id)
);
create index points_ledger_service_user_idx on public.points_ledger (service_id, user_id);
create index points_ledger_class_idx on public.points_ledger (class_id, user_id);
create index points_ledger_source_idx on public.points_ledger (source_id) where source_id is not null;

-- ---------------------------------------------------------------------------
-- Timeline, competitions, gifts, achievements
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  class_id uuid, -- null = whole service
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  check (length(trim(body)) > 0 or image_url is not null),
  foreign key (class_id, service_id) references public.classes (id, service_id) on delete cascade
);
create index posts_service_idx on public.posts (service_id, created_at desc);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  class_id uuid, -- null = whole service
  title text not null check (length(trim(title)) > 0),
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_points int not null default 0 check (max_points >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  foreign key (class_id, service_id) references public.classes (id, service_id) on delete cascade
);
create index competitions_service_idx on public.competitions (service_id, starts_at desc);

create table public.competition_questions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  question text not null check (length(trim(question)) > 0),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  correct_index int not null,
  points int not null default 1 check (points >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (correct_index >= 0 and correct_index < jsonb_array_length(options))
);
create index competition_questions_comp_idx on public.competition_questions (competition_id, sort_order);

create table public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '[]',
  score int not null default 0,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (competition_id, user_id)
);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  image_url text,
  cost_points int not null check (cost_points > 0),
  stock int check (stock is null or stock >= 0), -- null = unlimited
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index gifts_service_idx on public.gifts (service_id);

create table public.gift_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.redemption_status not null default 'requested',
  created_at timestamptz not null default now()
);
create index gift_redemptions_gift_idx on public.gift_redemptions (gift_id, status);
create index gift_redemptions_user_idx on public.gift_redemptions (user_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  icon text,
  criteria jsonb not null default '{}', -- e.g. {"type":"points_total","gte":500}
  created_at timestamptz not null default now()
);
create index achievements_service_idx on public.achievements (service_id);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (achievement_id, user_id)
);
create index user_achievements_user_idx on public.user_achievements (user_id);
