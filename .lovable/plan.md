## Goal

Track where each catalog item is physically stored (kits, drawers, shelves, etc.) with a per-source quantity. Customers keep seeing only the total available; admins manage sources and pick which source to draw from when marking a lend request as **delivered** (and which source to return into when marking as **returned**).

## Data model (new tables)

**`item_sources`** — closed list of storage locations, managed by admin.
- `id` uuid pk
- `name` text (e.g. "ארגז כלים אדום", "מגירה 3")
- `description` text nullable
- `is_active` boolean default true
- `sort_order` int default 0
- `created_at`, `updated_at`

**`catalog_item_sources`** — quantity of each item per source.
- `id` uuid pk
- `item_id` uuid → `catalog_items.id` (cascade delete)
- `source_id` uuid → `item_sources.id` (restrict delete)
- `quantity` int default 0 (≥ 0)
- `unique (item_id, source_id)`

**`lend_request_item_sources`** — records which source each delivered line was taken from, so we can return correctly.
- `id` uuid pk
- `lend_request_item_id` uuid → `lend_request_items.id` (cascade)
- `source_id` uuid → `item_sources.id`
- `quantity` int

### Triggers / sync rules

- DB trigger on `catalog_item_sources` keeps `catalog_items.quantity_total` and `quantity_available` in sync as `SUM(quantity)` per item. This becomes the single source of truth — admins stop editing totals directly.
- Replace existing `handle_lend_status_change` logic so it no longer auto-decrements/increments using `lend_request_items`. Source-level decrement/increment will be performed transactionally by the new edge function (see below) when admin picks sources. Totals refresh automatically via the sync trigger.

### RLS

- `item_sources`: admins ALL; authenticated SELECT (needed so the source dropdown can render names — names aren't sensitive). If you'd prefer fully hidden, restrict SELECT to admins; customer UI never queries it.
- `catalog_item_sources`: **admins only** (SELECT/INSERT/UPDATE/DELETE). Customers never read this — they only see aggregated `catalog_items.quantity_available`.
- `lend_request_item_sources`: admins only.

## Backend logic

New edge function **`deliver-lend-request`** (admin-only, verifies `has_role(admin)`):
- Input: `request_id`, and for each `lend_request_item` an array of `{ source_id, quantity }` whose sum equals the requested quantity.
- In a transaction: validates each source has enough stock, decrements `catalog_item_sources.quantity`, inserts rows in `lend_request_item_sources`, sets `lend_requests.status='delivered'` and `delivered_at=now()`.

New edge function **`return-lend-request`** (admin-only):
- Looks up `lend_request_item_sources` for the request, increments those source quantities back, sets `status='returned'`, `returned_at=now()`.
- (Default behavior: return to the same source it was taken from. Admin can override per row in the UI.)

## Admin UI changes (`src/pages/Admin.tsx`)

1. **New "מקורות" (Sources) tab** — CRUD for `item_sources` (name, description, active, sort).
2. **Catalog item editor** — add a "מיקומי אחסון" section listing rows of `{ source, quantity }` with add/remove. Saving syncs `catalog_item_sources`. The "סה״כ / זמין" fields become read-only computed totals.
3. **Catalog list** — admin item card shows a small breakdown: "ארגז אדום: 3 · מגירה 2: 1".
4. **Lend requests tab — delivery flow** — when admin clicks "מסור" on a pending request, open a dialog. For each requested item, show a small picker: rows of `{ source select, quantity input }` with running total vs. requested. Submit calls `deliver-lend-request`.
5. **On-loan tab — return flow** — "סמן כהוחזר" opens a dialog pre-filled with the sources items were taken from; admin can confirm or reassign before submit, which calls `return-lend-request`.
6. **CSV import/export** — add optional `sources` column (format `source_name:qty;source_name:qty`) so bulk edits stay possible. Unknown source names create new `item_sources` rows.

## Customer-facing changes

None visible. `src/pages/Catalog.tsx`, `src/pages/MyRequests.tsx` continue reading `quantity_available` / `quantity_total` from `catalog_items`, which is now derived but identical-looking.

## Migration of existing data

For each existing `catalog_items` row, create one `item_sources` row called "כללי" (or move all current stock there) and insert a matching `catalog_item_sources` row with `quantity = quantity_total`. After that, the sync trigger keeps totals consistent.

## Files touched

- New migration: tables, triggers, RLS, seed "כללי" source.
- New edge functions: `supabase/functions/deliver-lend-request/index.ts`, `supabase/functions/return-lend-request/index.ts`.
- `src/pages/Admin.tsx` — sources tab, item editor, deliver/return dialogs, CSV updates.
- New `src/components/admin/ItemSourcesManager.tsx` and `src/components/admin/SourcePicker.tsx`.
- No changes needed to `Catalog.tsx` or `MyRequests.tsx`.
