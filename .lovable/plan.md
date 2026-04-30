## Goal

Merge the equipment-request flow into the Catalog page, and make the cart highly visible and accessible from anywhere on the page (no scrolling needed).

The standalone "Request" page becomes a print-only flow (since printing has its own STL upload), and the Catalog becomes the single place to browse + add equipment to cart + check out.

## UX direction

Browsing equipment, picking quantities, and seeing the cart are tightly related — they belong on the same page. The cart will:
- Live in a **floating action button (FAB)** in the bottom corner with a live item count badge — visible from anywhere, no scrolling.
- Open as a **slide-in side panel (Sheet)** on click, containing the cart list, contact form, and submit button.
- On desktop, also stay accessible via a **header cart pill** next to the title for redundancy.

Adding to cart triggers a tiny pulse animation on the FAB plus a toast confirmation, so users always know the cart got their item.

### Catalog page (`/catalog`) — new structure

```text
[Header: "קטלוג ציוד"  + cart pill (count + "עגלה")]
[Search bar]
[Main category chips: הכל / חיישנים / אלקטרוניקה / ...]
[Advanced filter toggle (sub-categories)]
[Action: "בקש פריט שלא בקטלוג" + "הדפסת תלת מימד →"]
[Grid of items]
   each card: image, name, category, availability,
              [+ הוסף לעגלה] button (replaces "בקש להשאלה")
              shows "(x in cart)" when present

[Floating cart FAB, bottom-left in RTL] — always visible
  click → opens slide-in Sheet (right side in RTL):
    - Cart list (item, qty +/-, remove)
    - Empty state if no items
    - Contact form (name, email, phone, notes)
    - "Submit lend request" button
    - "Continue browsing" link

[Item details dialog — unchanged, but "Add to cart" instead of "Go to requests"]
```

### Requests page (`/requests`) — simplified

- Remove the "choose print/lend" landing.
- Remove the entire lend tab + cart sidebar.
- This page now goes **directly into the print form** (STL upload + filament color + purpose).
- A small banner at the top: "מחפשים להשאיל ציוד? עברו לקטלוג →" linking to `/catalog`.

### Nav

- Keep the `/requests` link but rename it to **"הדפסת תלת מימד"** (since that is now its only purpose).
- Catalog link stays — that is the equipment-request entry point.

### CTAs to update

- Homepage hero: keep "בקשה חדשה" → `/requests` (now print) and "קטלוג" → `/catalog` (equipment).
- `MyRequests` "בקשה חדשה" button: change to two small buttons "הדפסה" (`/requests`) + "השאלה" (`/catalog`).

## Technical implementation

### Files

**Edit `src/pages/Catalog.tsx`** — significant changes:
- Add cart state (`Record<string, number>`), `addToCart`, `removeFromCart`, `clearItem`, identical shape to current Requests cart logic.
- Replace per-card "בקש להשאלה" link with `Add to cart` button (with live "(x)" count badge if present).
- Item details dialog: replace `Link to /requests` with `Add to cart`.
- Add `Sheet` (shadcn) for the side cart panel (open state). On mobile, full-width; on desktop, ~420px wide, slides in from the right (since RTL).
- Add a fixed-position cart **FAB**: `<button class="fixed bottom-6 left-6 z-40 ...">` showing `<ShoppingCart />` + a `Badge` with total qty, with a subtle bounce animation when items are added (use a small `key={totalCount}` + Tailwind animation).
- Add a desktop header pill: visible `md:inline-flex` next to the title.
- Cart panel includes the lend form (name/email/phone/notes), prefilled from `useAuth` user metadata. Submit logic copied from Requests.tsx (insert `lend_requests`, then `lend_request_items`).
- Add "בקשה לפריט שלא בקטלוג" dialog (copy from Requests.tsx).
- If user is not logged in, the "submit" button shows "התחברו כדי להגיש בקשה" and links to `/auth?redirect=/catalog` (cart state is preserved within the same page; not persisted).
- Add link "הדפסת תלת מימד" prominent button near the top right of the catalog header → `/requests`.

**Edit `src/pages/Requests.tsx`** — simplification:
- Remove `mode` state, `lend` branch, cart logic, item-request dialog, catalog fetch, `setCatalogCategory`.
- Page renders the print form directly with the existing styling.
- Add a top banner: `<Link to="/catalog">מחפשים להשאיל ציוד? עברו לקטלוג ←</Link>`.

**Edit `src/components/SiteNav.tsx`** — rename label:
- `{ to: "/requests", label: "הדפסת תלת מימד" }` (or keep "בקשות" if we want to be less verbose — will use "הדפסה").

**Edit `src/pages/MyRequests.tsx`** — header buttons:
- Replace single "בקשה חדשה" with two outline buttons: "הדפסה" → `/requests`, "השאלה" → `/catalog`.

### Cart visibility behavior

- FAB: `fixed bottom-6 left-6 z-40` (left because RTL = visual "right side near content edge" feels right; will verify in browser).
- Hidden when cart sheet is open.
- Pulse animation: small Tailwind keyframe (`animate-cart-bump`) added in `tailwind.config.ts` keyframes — keeps with existing animation system. If we don't want to touch tailwind config, use the existing `animate-bounce` class triggered for ~600ms via state.
- Auto-open the cart sheet the first time the user adds an item (one-time, via a ref) so they immediately see where the cart lives.

### Out of scope

- No backend changes. Lend requests still go to the same `lend_requests` + `lend_request_items` tables.
- No changes to admin views.
- No changes to filament colors.

## Summary of what the user gets

1. **One catalog page** for browsing + cart + checkout. No more confusion about whether to go to `/requests` or `/catalog`.
2. **Floating cart button** always visible in the corner with a live count.
3. **Slide-in cart panel** with the contact form — no scrolling required.
4. `/requests` becomes the dedicated 3D-print form, with a clear pointer to the catalog for equipment.
