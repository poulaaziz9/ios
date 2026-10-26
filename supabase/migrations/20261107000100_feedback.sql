-- Complaints & suggestions (الشكاوى والمقترحات): church admins write to the
-- platform owner (super admin), who replies in the same thread.
--   status: open (waiting for the super admin) → answered (super admin
--   replied) → closed. A new message from the church reopens it.

create type public.feedback_kind as enum ('complaint', 'suggestion');
create type public.feedback_status as enum ('open', 'answered', 'closed');

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  kind public.feedback_kind not null,
  subject text not null check (length(trim(subject)) > 0),
  body text not null check (length(trim(body)) > 0),
  status public.feedback_status not null default 'open',
  last_message_at timestamptz not null default now(),
  -- When a church admin last opened the thread (for the "new reply" badge).
  church_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index feedback_church on public.feedback (church_id, last_message_at desc);
create index feedback_status on public.feedback (status, last_message_at desc);

create table public.feedback_replies (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  from_platform boolean not null default false,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index feedback_replies_thread on public.feedback_replies (feedback_id, created_at);

alter table public.feedback enable row level security;
alter table public.feedback_replies enable row level security;

create trigger feedback_fixed_parent before update on public.feedback
  for each row execute function public.forbid_parent_change('church_id', 'author_id', 'kind');

-- Only real church admins of that church (the super admin answers, not asks).
create function public.is_church_admin_of(p_church uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.church_roles cr
    where cr.church_id = p_church and cr.user_id = (select auth.uid()) and cr.role = 'church_admin'
  );
$$;

create function public.feedback_church_id(p_feedback uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select f.church_id from public.feedback f where f.id = p_feedback;
$$;

create policy "feedback: platform and church admins read"
  on public.feedback for select to authenticated
  using (public.is_super_admin() or public.is_church_admin_of(church_id));
create policy "feedback: church admins write"
  on public.feedback for insert to authenticated
  with check (public.is_church_admin_of(church_id) and author_id = (select auth.uid()) and status = 'open');
create policy "feedback: platform sets status"
  on public.feedback for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "feedback_replies: read with the thread"
  on public.feedback_replies for select to authenticated
  using (public.is_super_admin() or public.is_church_admin_of(public.feedback_church_id(feedback_id)));
create policy "feedback_replies: write in the thread"
  on public.feedback_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (from_platform and public.is_super_admin())
      or (not from_platform and public.is_church_admin_of(public.feedback_church_id(feedback_id)))
    )
  );

revoke all on public.feedback, public.feedback_replies from anon, authenticated;
grant select, insert on public.feedback, public.feedback_replies to authenticated;
grant update (status) on public.feedback to authenticated;

-- A message moves the thread: the platform's reply marks it answered, the
-- church's reply (re)opens it.
create function public.feedback_after_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.feedback
     set status = case when new.from_platform then 'answered'::public.feedback_status else 'open' end,
         last_message_at = new.created_at,
         church_seen_at = case when new.from_platform then church_seen_at else new.created_at end
   where id = new.feedback_id;
  return new;
end;
$$;
create trigger feedback_replies_move_thread after insert on public.feedback_replies
  for each row execute function public.feedback_after_reply();

-- A church admin opened the thread: clears its "new reply" badge.
create function public.mark_feedback_seen(p_feedback uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_church_admin_of(public.feedback_church_id(p_feedback)) then
    return;
  end if;
  update public.feedback set church_seen_at = now() where id = p_feedback;
end;
$$;

revoke execute on function
  public.is_church_admin_of(uuid),
  public.feedback_church_id(uuid),
  public.feedback_after_reply(),
  public.mark_feedback_seen(uuid)
from anon, public;
revoke execute on function public.feedback_after_reply() from authenticated;
grant execute on function
  public.is_church_admin_of(uuid),
  public.feedback_church_id(uuid),
  public.mark_feedback_seen(uuid)
to authenticated;
