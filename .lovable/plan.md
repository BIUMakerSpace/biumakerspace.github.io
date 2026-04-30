## Goals

Add a public-facing catalog browser at `/catalog` with search + category filter, and surface it in the top nav. Categorize items into: sensors, tools, microcontrollers, other.

## 1. Database

Add a `category` column to `catalog_items`:
- Type: `text` with `CHECK` allowing `'sensors' | 'tools' | 'microcontrollers' | 'other'`
- Default `'other'`, NOT NULL
- Backfill existing rows to `'other'`

(No new RLS needed — public SELECT already exists.)

## 2. New page: `src/pages/Catalog.tsx`

A public browse-only catalog (no cart, no auth required). Layout:

```text
┌──────────────────────────────────────────────────────┐
│  קטלוג ציוד                                          │
│  כל הציוד הזמין במייקרספייס                          │
│                                                       │
│  [🔍 חיפוש פריט...........................]          │
│  [הכל] [חיישנים] [כלים] [בקרים] [אחר]                │
│                                                       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │ img │ │ img │ │ img │ │ img │                     │
│  │ name│ │ name│ │ name│ │ name│                     │
│  │ cat │ │ cat │ │ cat │ │ cat │                     │
│  └─────┘ └─────┘ └─────┘ └─────┘                     │
└──────────────────────────────────────────────────────┘
```

- Fetch all `catalog_items` on mount.
- Search input filters case-insensitively across `name` + `description`.
- Category filter as toggle pill row (`Button variant="outline" / "default"`).
- Card grid: image, name, category badge, availability count, description (line-clamp-2). Click opens a Dialog with full details.
- "השאל פריט" button on each card → links to `/requests` (which gates auth).
- Empty state when no matches.
- Wired into `App.tsx` route `/catalog`.

## 3. Top nav (`SiteNav.tsx`)

Insert `{ to: "/catalog", label: "קטלוג" }` right after "בית". Visible to everyone (public).

## 4. Admin (`Admin.tsx`)

- `CatalogItem` interface gains `category: string`.
- Add a category `<select>` to the "הוספת פריט" form and the edit dialog (4 options).
- CSV export: include `category` column.
- CSV import: read `category` column; default to `'other'` when missing/invalid.
- Optional category filter in catalog management list (skip for now unless trivial).

## 5. Existing Requests page

- Add a category badge on each catalog card (small, muted).
- Add the same category filter pills above the catalog grid in the lend tab so users can narrow down.

## Hebrew labels

- sensors → חיישנים
- tools → כלים
- microcontrollers → בקרים
- other → אחר

Centralize in a small `CATEGORY_LABELS` constant in a new file `src/lib/categories.ts` and reuse across Admin / Requests / Catalog.

## Out of scope

- No editing categories in bulk UI beyond CSV.
- No subcategories.
- No icon per category (keep simple with text badge).
