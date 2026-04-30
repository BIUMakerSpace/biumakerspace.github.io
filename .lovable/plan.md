## Goal
Replace the "קהילה" dropdown in the navbar with a single nav link pointing to a new dedicated `/community` landing page. The page presents three editorial-style cards: Blog, Forum, and WhatsApp.

## Changes

### 1. New page: `src/pages/Community.tsx`
Editorial landing page in RTL, matching the bold amber/charcoal aesthetic.

- **Hero**: DM Serif Display headline (e.g. "הקהילה שלנו"), short Inter subhead about the makerspace community.
- **Three large cards** (stacked on mobile, 3-col grid on `md+`):
  1. **בלוג** — icon `BookOpen`, short description ("מאמרים, מדריכים וסיפורים מהמייקרספייס"), CTA → `/blog`.
  2. **פורום** — icon `MessagesSquare`, description ("שאלות, דיונים ועזרה מהקהילה"), CTA → `/forum`.
  3. **וואטסאפ** — icon `MessageCircle` (green `#25D366` accent), description ("הצטרפו לקבוצה לעדכונים בזמן אמת"), CTA → external WhatsApp URL (`target="_blank"`, `rel="noopener noreferrer"`).
- Framer Motion: staggered fade-in for headline + cards, subtle hover lift on each card (matches existing animation memory).
- Use existing tokens: `bg-card`, `border-border`, `text-primary` for amber accents, serif `font-display` (or whatever class headers use elsewhere — will match existing pages).

### 2. Add route in `src/App.tsx`
- Import `Community` and add `<Route path="/community" element={<Community />} />`.

### 3. Simplify `src/components/SiteNav.tsx`
- Remove the entire `DropdownMenu` block (desktop) and the mobile "קהילה" sub-section with three links.
- Add a single entry to the `links` array: `{ to: "/community", label: "קהילה" }` — placed after `/requests` (and conditional admin/my-requests stay after as today).
- Remove now-unused imports: `DropdownMenu*`, `ChevronDown`, `BookOpen`, `MessagesSquare`, `MessageCircle`, and the `WHATSAPP_URL` constant + `socialActive` variable.
- Result: `/blog` and `/forum` routes still work directly, but they're discovered via the Community page.

## Notes
- The existing `/blog` and `/forum` pages remain untouched and fully functional.
- Highlight state for "קהילה" in the navbar will work automatically via the existing `pathname === l.to` check (active only on `/community`, not on `/blog` or `/forum` — which is the intended behavior since Community is now its own destination).