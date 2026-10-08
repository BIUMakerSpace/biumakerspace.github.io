# Launch checklist

The code is ready (branch `migrate-off-lovable`). These steps connect it to accounts you own and put the site live at
**https://omriper.github.io/biu-makerspace-website/**. Do them in order; later steps need values from earlier ones.

Legend: 👤 needs you (account/dashboard access) · 🤖 can be done by Claude/CLI once access exists

## Before launch

### 1. 👤 Create the Supabase project
- [ ] supabase.com → New project (region: e.g. Frankfurt). **Save the database password.**
- [ ] Project Settings → API keys: note the **project URL** (`https://<ref>.supabase.co`), the **publishable key**
      (`sb_publishable_…`) and the **secret key** (only for the catalog import in step 9; never commit or share it).

### 2. 👤 Create the Google OAuth client
- [ ] console.cloud.google.com → new project → **OAuth consent screen**: External, app name "BIU MakerSpace".
- [ ] **Authorized domains**: `<ref>.supabase.co` and `omriper.github.io`.
      (Not `supabase.co` / `github.io` — Google rejects shared hosting domains; it wants your own subdomain.)
- [ ] **Publish the app** ("In production"). In "Testing" mode only manually listed test users can sign in.
      Basic email/profile sign-in does not require Google verification.
- [ ] Credentials → Create **OAuth client ID** → Web application. Authorized redirect URI:
      `https://<ref>.supabase.co/auth/v1/callback`. Copy the client ID and client secret.

### 3. 👤 Configure Supabase Auth (dashboard)
- [ ] Authentication → Sign In / Providers → **Google**: enable, paste client ID + secret.
- [ ] Authentication → URL Configuration:
  - Site URL: `https://omriper.github.io/biu-makerspace-website`
  - Redirect URLs: `https://omriper.github.io/biu-makerspace-website/**` and `http://localhost:8080/**`

### 4. 🤖 Push the database schema
Needs Node 22 (see "Developer setup" below) and a one-time interactive login in your own terminal:
```sh
npx supabase login                          # opens the browser
npx supabase link --project-ref <ref>       # asks for the database password from step 1
npx supabase db push                        # applies supabase/migrations/*
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts   # optional sanity check: no diff
```

### 5. 👤 Set up GitHub Pages
- [ ] Settings → General → make the repository **public** (free GitHub Pages requires it).
- [ ] Settings → Pages → Source: **GitHub Actions**.
- [ ] Settings → Secrets and variables → Actions → **Variables** tab (not Secrets):

  | Name | Value |
  |---|---|
  | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
  | `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key |
  | `VITE_PUBLIC_SITE_URL` | `https://omriper.github.io/biu-makerspace-website` |
  | `VITE_BASE_PATH` | `/biu-makerspace-website/` |

### 6. 👤 Disconnect Lovable from the repository
- [ ] In Lovable's GitHub integration settings (or GitHub → Settings → Applications), remove Lovable's access.
      Otherwise an edit in Lovable can push to `main` and undo this work.

### 7. 🤖 Merge and deploy
- [ ] Push `migrate-off-lovable`, open a PR, let CI pass, merge into `main`.
- [ ] The "Deploy to GitHub Pages" workflow runs on `main` (~2 min). Check the Actions tab, then open the site.

### 8. 👤 Make yourself admin
- [ ] Sign in once on the live site with Google.
- [ ] Supabase → SQL Editor:
  ```sql
  insert into user_roles (user_id, role)
  select id, 'admin' from auth.users where email = 'omri.perry42@gmail.com';
  ```
- [ ] Reload the site: the "ניהול" (admin) tab appears.

**The site is live at this point.**

## After launch

### 9. Import the catalog from the old Lovable site (optional, recommended)
The catalog, storage sources, filament colors, email templates and wishlist can be copied; accounts, requests,
posts and lockers start fresh. Full instructions in the README ("Migrating the catalog"). In short:
- [ ] Sign in as admin on the old live site; copy `access_token` from DevTools → Local Storage → `sb-<ref>-auth-token`
      (expires in ~1 hour).
- [ ] `node scripts/export-catalog.mjs` with `OLD_SUPABASE_URL`, `OLD_SUPABASE_ANON_KEY` (see `git show 8b7d932^:.env`)
      and `OLD_ACCESS_TOKEN`. It lists equipment currently out on loan.
- [ ] `node scripts/import-catalog.mjs --dry-run`, then without `--dry-run` (add `--include-on-loan` to put lent
      units back on the shelf), using the new `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

### 10. Update the loan return deadline
- [ ] `LOAN_RETURN_DEADLINE` in `src/config.ts` still says `1.7.2026`, which has passed. Set the current academic
      year's date (it's shown in the lending terms on the cart).

### 11. Reprint the locker QR codes
- [ ] The printed codes point to the old `biumakerspace.lovable.app`. Admin → "לוקרים" → download each QR and replace it.

### 12. Keep the free Supabase project awake (if needed)
- [ ] Free Supabase projects pause after ~7 days without traffic (data is kept; restore from the dashboard).
      If that becomes a nuisance, add a scheduled GitHub Action that makes a cheap API request twice a week.

## Developer setup
- [ ] Install Node 22. Your shell is fish, so use fnm rather than nvm:
      `curl -fsSL https://fnm.vercel.app/install | bash`, restart the terminal, `fnm install 22`.
- [ ] Docker for the local Supabase stack. Local development is described in the README.
