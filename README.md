# BIU CS MakerSpace website

Hebrew (RTL) site for the Bar-Ilan CS MakerSpace: equipment catalog and lending, 3D-print requests, lockers, blog and forum, plus an admin area.

**Stack:** React 18 + Vite + TypeScript + Tailwind/shadcn-ui + TanStack Query on the frontend; Supabase (Postgres, Auth with Google, Storage) as the backend. All business rules (permissions, inventory, request states) live in the database as RLS policies, triggers and RPCs under `supabase/migrations/`, covered by pgTAP tests in `supabase/tests/`. There are no edge functions. Hosted for free on GitHub Pages.

**Layout:** `src/pages` (routes; `pages/admin` has one file per admin tab), `src/components` (`catalog/`, `admin/`, `layout/`, shadcn `ui/`), `src/lib` (helpers; `lib/queries` holds all Supabase reads/writes as React Query hooks), `src/content` (static landing-page content).

## Local development

Requirements: Node 22 (`nvm use`), Docker.

```sh
npm install
npx supabase start          # local Postgres/Auth/Storage, applies migrations + seed.sql
cp .env.example .env        # then paste the publishable key printed by `supabase start`
npm run dev                 # http://localhost:8080
```

In `npm run dev`, the sign-in page also shows an email/password form (creates the user on first use), so you don't need Google credentials locally. To make yourself admin locally:

```sh
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = 'you@example.com';"
```

(or run the same SQL in Studio at http://127.0.0.1:54323).

Useful commands:

| Command | What it does |
|---|---|
| `npm run lint` / `npm run typecheck` / `npm test` | Static checks and unit tests |
| `npm run build` | Production build into `dist/` (also writes `404.html` for GitHub Pages) |
| `npx supabase db reset` | Rebuild the local DB from migrations + seed |
| `npx supabase test db` | Run the pgTAP database tests in `supabase/tests/` |
| `npx supabase gen types typescript --local > src/integrations/supabase/types.ts` | Regenerate DB types after a schema change |

## Changing the database

1. `npx supabase migration new <name>` and write SQL in the new file.
2. `npx supabase db reset` to apply locally, add or adjust tests in `supabase/tests/`, regenerate types.
3. After merging: `npx supabase db push` applies pending migrations to the linked hosted project.

Never edit a migration that has already been pushed; add a new one.

## Environment variables

See `.env.example`. All are public (bundled into the browser); the Supabase **secret** key must never be used in the frontend.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `VITE_PUBLIC_SITE_URL` | Public site URL incl. base path, no trailing slash (locker QR codes, social tags) |
| `VITE_BASE_PATH` | `/` for a custom domain, `/biu-makerspace-website/` for the GitHub Pages project URL |

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, typecheck, tests, build, then publish `dist/` to GitHub Pages. One-time setup:

1. **GitHub:** repo must be public (free Pages). Settings → Pages → Source: *GitHub Actions*. Settings → Secrets and variables → Actions → **Variables**: set the four `VITE_*` variables above.
2. **Supabase:** create a project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`.
3. **Google OAuth:** create an OAuth client (Web) in Google Cloud Console with authorized redirect URI `https://<ref>.supabase.co/auth/v1/callback`. In Supabase → Authentication → Providers → Google, paste the client ID/secret.
4. **Supabase URL config** (Authentication → URL Configuration): Site URL = the public site URL; redirect URLs = `<public site URL>/**` and `http://localhost:8080/**`.
5. Sign in once on the live site, then make yourself admin in the SQL editor:
   `insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = '<you>';`

## Migrating the catalog from the old (Lovable) project

The catalog, storage sources, filament colors, email templates and wishlist can be copied over; user accounts, requests, posts and lockers start fresh (people sign in with Google again).

1. Sign in as an admin on the old live site and copy your `access_token` (DevTools → Application → Local Storage → `sb-<ref>-auth-token`). It expires after about an hour.
2. Export (the old project's URL and public key are in git history: `git show 8b7d932^:.env`):
   ```sh
   OLD_SUPABASE_URL=https://<old-ref>.supabase.co OLD_SUPABASE_ANON_KEY=<old key> OLD_ACCESS_TOKEN=<token> \
     node scripts/export-catalog.mjs
   ```
   This writes `scripts/export/*.json` (gitignored) and lists equipment that is currently out on loan.
3. Import into the new project with its **secret** key (local machine only, never commit it):
   ```sh
   SUPABASE_URL=https://<new-ref>.supabase.co SUPABASE_SECRET_KEY=<secret key> \
     node scripts/import-catalog.mjs --dry-run      # check the counts first
   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/import-catalog.mjs [--include-on-loan]
   ```
   `--include-on-loan` puts units that were out on loan back on the shelf (loans aren't migrated, so nobody could return them in the new system). The import is safe to re-run.

Note: Supabase's free tier pauses a project after about a week with no traffic; restore it from the dashboard if that happens.
