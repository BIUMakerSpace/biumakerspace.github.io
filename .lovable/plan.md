## Overview

Redesign the `/requests` page so users first **choose** what they want to do (3D print or borrow equipment) on a clean landing screen, then the relevant form/catalog opens. Replace the free-text filament color field with a **dropdown** populated from a new database table that admins can manage.

## 1. New database table — `filament_colors`

Add a small admin-managed list of available filament colors.

Fields:
- `name` (text, required) — Hebrew display name (e.g. "שחור", "כחול")
- `hex` (text, optional) — color swatch like `#1a1a1a` for visual preview
- `is_active` (boolean, default true) — admins can hide a color without deleting it
- `sort_order` (integer, default 0) — controls dropdown ordering

Access rules:
- Anyone (including signed-out) can read active colors (so the form dropdown works).
- Only admins can add, edit, or delete colors.

Seed initial colors: שחור, לבן, אפור, כחול, אדום, ירוק, צהוב, כתום (so the app works immediately after migration).

## 2. Requests page redesign (`src/pages/Requests.tsx`)

Replace the current always-visible Tabs with a **chooser-first** flow:

```text
                    ┌───────────────────────────────────┐
                    │            בקשות                   │
                    │  מה תרצו לבקש היום?                │
                    └───────────────────────────────────┘
       ┌──────────────────────┐    ┌──────────────────────┐
       │  🖨  הדפסת תלת מימד   │    │  🛍  השאלת ציוד       │
       │  שלחו קובץ STL להדפסה │    │  השאילו רכיבים וכלים │
       │       [התחל]          │    │       [התחל]          │
       └──────────────────────┘    └──────────────────────┘
```

- **Initial state**: two large, equally weighted choice cards (printing vs. lending). No form visible until one is picked.
- **After selection**: the chosen flow takes over the page, with a **"חזרה לבחירה"** back button at the top to return to the chooser.
- Drives state with a single `mode: "choose" | "print" | "lend"` instead of always-mounted Tabs.
- Existing form logic (validation, submission, cart) is preserved — only the wrapping UX changes.

### Filament color dropdown

- Replace the free-text `Input` for `pColor` with a `Select` (shadcn) populated from `filament_colors` (active only, ordered by `sort_order`).
- If a `hex` value exists, render a small color swatch next to each option.
- Validation continues to require a non-empty value.
- Loading state: show a disabled "טוען צבעים..." placeholder while fetching.

## 3. Admin section — filament colors manager (`src/pages/Admin.tsx`)

Add a new tab **"צבעי פילמנט"** alongside the existing tabs, with:

- Form to add a new color (name + optional hex picker + active toggle).
- Table/list of existing colors showing swatch, name, active status, with **edit**, **toggle active**, **delete**, and **reorder** (up/down arrows for `sort_order`) actions.
- Inline edit dialog reusing the existing dialog pattern from the catalog edit flow.

## Technical notes

- New file: `src/lib/filamentColors.ts` — small typed helper `fetchFilamentColors()` and the `FilamentColor` type, used by both Requests and Admin.
- Migration adds the table, RLS policies (public read for active rows; admin-only write via existing `has_role`), seeds defaults, and adds an `updated_at` trigger reusing the existing `set_updated_at()` function.
- No changes to `print_requests` schema — `filament_color` remains a text column storing the chosen color name (keeps history readable even if the color is later removed from the active list).
- All UI follows existing semantic tokens (no hardcoded colors), `dir="rtl"`, and the project's button/card styles. New chooser cards use `lg` buttons, large icons, and `hover:shadow-md` consistent with other cards.

## Out of scope

- Changing the look of the lend catalog grid or the print form fields beyond the color dropdown.
- Color picker UI in the form (just selection from the admin list).
