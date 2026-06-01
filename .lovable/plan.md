## Findings from mobile review (390×844)

I navigated the live preview at mobile width, added an item to the cart, opened the cart sheet and tried to submit. Checkout actually does fire (HTML5 validation fires on empty "שם מלא"), so the bug isn't a dead button — it's that the **cart sheet is unusable on mobile**:

- The sheet is `flex flex-col` with a scrolling items list and a fixed-bottom form. On a phone the form (name + phone + email + notes + the long הצהרת השאלה block + submit) eats almost the entire viewport.
- That leaves the cart-items list squeezed into a ~50px strip — only one item is partially visible and the user can't really see what they're checking out.
- With a soft keyboard open it gets worse: the submit button is pushed off-screen behind the keyboard, which is very likely what the user is hitting when they say "can't checkout".
- The X close button on the sheet and the "חזרה" button overlap visually in RTL.

Home page and catalog grid otherwise look fine on mobile — hero, category pills, advanced-filter toggle, "הוסף לעגלה" buttons, floating cart FAB and bottom nav are all reachable and tap-sized.

## Plan

Rework the mobile layout of the cart `Sheet` in `src/pages/Catalog.tsx` only — no business logic changes.

1. **One scroll, not two.** Remove the inner `overflow-y-auto` on the items list and the fixed-bottom form. Wrap items + form in a single scroll container so the whole sheet scrolls naturally on mobile, and the submit button comes into view when the user scrolls down. On `sm:` and up, keep the current split (items scroll, form pinned) since there's enough height.

2. **Sticky submit bar on mobile.** Pull the final submit `Button` (and a compact total like "שלח בקשת השאלה (N)") into a `sticky bottom-0` bar inside the scroll container with a solid background + top border, so it stays reachable even with the keyboard open. The agreement checkbox stays in the form body above it.

3. **Compact the agreement block on mobile.** The 4-bullet הצהרת השאלה takes ~40% of the screen. Default to a collapsed summary ("קראתי ואני מאשר/ת את תנאי ההשאלה") with a "הצג תנאים" toggle that expands the full list. Desktop keeps it fully expanded.

4. **Fix the close affordance.** The sheet currently shows both the built-in `SheetContent` X and our custom "חזרה" button in the header, overlapping in RTL. Hide the default close (`[&>button]:hidden` on `SheetContent`, same trick used elsewhere in shadcn) and keep only the "חזרה" button, moved to the start of the row so it doesn't crowd the title.

5. **Minor mobile tap-target polish in the cart row.** The −/qty/+/trash cluster is `h-7 w-7` icon buttons (28px) — bump to `h-9 w-9` on mobile (`h-9 w-9 sm:h-7 sm:w-7`) to meet ~44px tap targets without changing desktop density.

6. **Quick pass on the rest of mobile.** Verify the Index page Zoom/tutorial button row, the catalog filter pills, and the SiteNav menu open/close at 390px after the change. No edits expected unless something regresses.

### Files touched
- `src/pages/Catalog.tsx` — restructure the `<Sheet>` body (single mobile scroll, sticky submit, collapsible agreement, header close fix, larger qty buttons).

### Out of scope
- Backend, schema, RLS, edge functions — unchanged.
- Desktop layout — visually unchanged.
