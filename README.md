# خدمتي — Sunday school services manager

Multi-church PWA for managing church youth services. The full product and technical spec is in [`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 + shadcn/ui (RTL) · Supabase (Auth, Postgres + RLS) · Serwist PWA.

## Getting started

```bash
npm install
npx supabase start              # local Supabase (needs Docker)
cp .env.example .env.local      # paste the URL + publishable key printed by `supabase start`
npm run dev
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run db:reset` | Recreate the local DB from `supabase/migrations` (+ seed) |
| `npm run db:types` | Regenerate `lib/database.types.ts` from the local DB |
| `npm run test:db` | RLS test suite (pgTAP, `supabase/tests/database`) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run icons` | Regenerate PWA icons in `public/icons` |

## Auth: phone + password without SMS

Kids sign up with **name + Egyptian mobile + password**. To avoid needing an SMS provider, the phone is normalized to E.164 (`+201012345678`, accepts `01…`, `+20…`, `0020…`, Arabic-Indic digits) and stored in Supabase Auth under a synthetic email `201012345678@phone.khedma.app`. The real phone goes into `profiles.phone`.

Login accepts either a phone (mapped the same way) or a real email (for admin accounts created with one).

**Hosted Supabase project:** turn **off** Auth → Providers → Email → *Confirm email*, otherwise phone signups wait for a confirmation mail that can never arrive.

## Seed accounts (local only)

`supabase db reset` loads `supabase/seed.sql`. Password for all: `password123`.

| Role | Phone |
|---|---|
| Super admin | 01000000001 |
| Church admin | 01000000002 |
| Service admin (خدمة إعدادي) | 01000000003 |
| Servants | 01100000001, 01100000002 |
| Served ×6 | 01200000001 … 01200000006 |

Join codes: `EADY1A` (أولى إعدادي), `EADY2B` (تانية إعدادي), `EADYALL` (service-level, joins as pending).

## Data access model

Every table has RLS with default deny; see `supabase/migrations/*_rls_*.sql`. Things to know when writing queries:

- **`profiles.phone` and `competition_questions.correct_index` are not selectable** (column grants), so `select("*")` on those tables fails. List the columns. Read phones with `rpc("visible_phone", { p_user })` (self, admins over that user, and their assigned servant only) and answer keys with `rpc("competition_answer_key", { p_competition })` (service admins only).
- **No direct writes** to `points_ledger`, `visits`, `prep_attendance`, `competition_entries`, `gift_redemptions`, `user_achievements`. These are written by `SECURITY DEFINER` RPCs that add the matching ledger entry (phases 4–8).
- Leaderboards: `v_service_leaderboard` / `v_class_leaderboard`, filtered to services the caller belongs to.
- Storage paths: `avatars/<user_id>/…`, `service-media/<service_id>/…`. Both buckets are private, so use signed URLs.

## Project layout

```
app/(auth)/          login, signup + server actions
app/serwist/[path]/  service worker route (Serwist + Turbopack)
app/sw.ts            service worker source
app/manifest.ts      PWA manifest (ar, rtl)
components/ui/       shadcn/ui components
lib/supabase/        browser, server and proxy clients
lib/strings.ts       all Arabic UI strings
proxy.ts             session refresh + optimistic auth redirect (Next 16's name for middleware.ts)
supabase/migrations/ SQL migrations
```

## Notes

- **Privacy on shared phones:** the service worker caches only static build assets and icons. Pages, RSC payloads and Supabase calls are always network-only, and an offline fallback page is shown instead.
- `cacheComponents` is off: nearly every page is per-user, so the classic dynamic rendering model is simpler here.
- shadcn components were added by hand (the registry was unreachable from the build environment). `components.json` is set up, so `npx shadcn add <component>` works normally from now on.
