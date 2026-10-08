# BIU CS MakerSpace website

Hebrew (RTL) site for the Bar-Ilan CS MakerSpace: equipment catalog and lending, 3D-print requests, lockers, blog and forum, plus an admin area.

**Stack:** React 18 + Vite + TypeScript + Tailwind/shadcn-ui on the frontend; Supabase (Postgres, Auth with Google, Storage) as the backend. All business rules (permissions, inventory, request states) live in the database as RLS policies, triggers and RPCs under `supabase/migrations/`. Hosted for free on GitHub Pages.

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

Note: Supabase's free tier pauses a project after about a week with no traffic; restore it from the dashboard if that happens.
