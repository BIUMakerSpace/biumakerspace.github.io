## Mobile review of the homepage

Issues observed on the current `/` page at mobile widths:

1. **Hero** uses `text-5xl` (huge on small screens), full viewport height, and only contains a logo + tagline — no call-to-action. Lots of vertical empty space before any actionable content.
2. **Features section** (Cpu / Users / Lightbulb) stacks into 3 tall full-width blocks (per the screenshot), each with a ton of vertical padding — user has to scroll a long way to reach resources.
3. **Resources tabs** — already a 2x2 grid on mobile, but icons + Hebrew labels can clip; touch targets small.
4. **Resource / project / inspiration cards** — `p-6` on cards is heavy on mobile; titles wrap awkwardly.
5. **Section padding** — `py-20` everywhere is too tall on phone.
6. **No quick path** from the hero to "Catalog / Requests / Blog" on mobile (the nav is hidden behind the hamburger).

## What the plan does

### Hero (mobile-first)
- Reduce hero height on mobile: `min-h-[80vh]` instead of full viewport.
- Smaller heading on mobile: `text-4xl` then scale up.
- Tighten paragraph: `text-base` on mobile.
- Add two primary CTAs under the tagline: **בקשה חדשה** (→ `/requests`) and **קטלוג** (→ `/catalog`). Stacked full-width on mobile, side-by-side on `sm:`.
- Keep the bouncing arrow but reduce its top margin on mobile.

### Features strip
- On mobile: switch from 3 stacked tall blocks to a compact **horizontal row of 3 small cards** (icon + short title only, description hidden on mobile). On `md:` restore the current 3-column layout with descriptions.
- Reduce section padding to `py-10 md:py-20`.

### Resources section
- Section padding `py-12 md:py-20`.
- Tabs: ensure each trigger is full-width within its grid cell, larger touch target (`py-2`), allow text to wrap to two lines if needed.
- Card grids stay 1 column on mobile (already are at default), but reduce internal padding from `p-5/p-6` to `p-4` on mobile, `sm:p-5`/`sm:p-6` larger.
- Section heading: `text-2xl md:text-4xl` instead of `text-3xl md:text-4xl` to reduce mobile weight.

### Footer
- Smaller text on mobile, comfortable spacing.

### Files touched
- `src/pages/Index.tsx` — all of the above.
- `src/components/ResourceCard.tsx` — only if its padding is too heavy on mobile (will check; tweak `p-*` if needed).

No new dependencies, no backend changes, no design-system token changes (still amber/charcoal, DM Serif Display + Inter).
