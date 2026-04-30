## Goals

1. Split CSV "download" into two distinct actions: download an empty template, and download the current catalog.
2. Improve visual hierarchy on the catalog management section so the tools area reads as a separate, labeled panel rather than a thin button row stuck above the list.

## Changes (all in `src/pages/Admin.tsx`)

### 1. Split CSV download into two functions

Replace `downloadCsvTemplate` with two helpers sharing a small internal builder:

- `downloadCsvFormat()` — always writes only the header row plus one example row (`דוגמה: מברג, …`). Filename: `catalog-template.csv`. Used to teach the user the expected columns.
- `downloadCsvCatalog()` — writes the header row plus every current item. Filename: `catalog-export.csv`. Disabled when `items.length === 0`.

Upload handler (`handleCsvUpload`) stays exactly as is — still INSERT-only, never deletes/updates.

### 2. New "Catalog tools" panel

Above the items grid, replace the current thin header+buttons row with a dedicated card:

```text
┌─────────────────────────────────────────────────────────┐
│  כלי קטלוג                                              │
│  ניהול מרוכז של הקטלוג דרך קובץ CSV                    │
│                                                          │
│  [⬇ הורד תבנית]  [⬇ הורד קטלוג נוכחי]  [⬆ העלה CSV]   │
│                                                          │
│  • הורד תבנית – קובץ ריק עם כותרות העמודות לדוגמה      │
│  • הורד קטלוג נוכחי – ייצוא של כל הפריטים הקיימים      │
│  • העלה CSV – מוסיף פריטים חדשים בלבד; לא מוחק/מעדכן   │
└─────────────────────────────────────────────────────────┘

פריטים קיימים (37)
┌─────────┬─────────┐
│ item    │ item    │
└─────────┴─────────┘
```

Implementation details:
- Card uses `rounded-2xl border border-border bg-card p-5`, matching the "הוספת פריט" form styling on the right.
- Inside: small uppercase eyebrow `כלי קטלוג` (`text-xs font-semibold tracking-wider text-primary uppercase`), then a bold title row (`text-lg font-bold`) with subtitle (`text-sm text-muted-foreground`).
- Buttons row: `flex flex-wrap gap-2`. Primary action = "העלה CSV" (`variant="default"`). Two downloads = `variant="outline"`. Each keeps its lucide icon (`FileDown`, `Download`, `Upload`).
- Bullet info list replaces the current paragraph for clearer scanning.

### 3. "פריטים קיימים (N)" heading

Promoted to its own row beneath the tools card with a top border separator: `mt-6 border-t border-border pt-6 text-xl font-bold`. The count badge stays inline.

### 4. Disabled state

"הורד קטלוג נוכחי" is `disabled` when `items.length === 0` so users aren't offered an empty download.

## Out of scope

- No changes to other admin tabs.
- No DB schema changes.
- No changes to upload behavior (already add-only).
