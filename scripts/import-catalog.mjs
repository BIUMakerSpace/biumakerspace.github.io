// Imports scripts/export/*.json (from export-catalog.mjs) into the NEW Supabase project.
//
//   SUPABASE_URL=https://<new-ref>.supabase.co \
//   SUPABASE_SECRET_KEY=<new project's secret / service_role key> \
//   node scripts/import-catalog.mjs [--dry-run] [--include-on-loan]
//
// Run locally only; the secret key bypasses RLS and must never be committed or used in the app.
// Safe to re-run: rows are upserted by id. Catalog images stored in the old project's
// "catalog-images" bucket are copied to the new bucket; external image URLs are kept as-is.
//   --include-on-loan  add units that were out on loan at export time back into their source
//                      (loans themselves aren't migrated, so nobody could "return" them later).
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");
const INCLUDE_ON_LOAN = process.argv.includes("--include-on-loan");
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (see header comment).");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const read = (name) => {
  const file = new URL(`./export/${name}.json`, import.meta.url);
  if (!existsSync(file)) throw new Error(`Missing scripts/export/${name}.json — run export-catalog.mjs first.`);
  return JSON.parse(readFileSync(file, "utf8"));
};
const check = ({ error }, what) => { if (error) throw new Error(`${what}: ${error.message}`); };
const log = (...a) => console.log(DRY ? "[dry-run]" : "", ...a);

const items = read("catalog_items");
const sources = read("item_sources");
const itemSources = read("catalog_item_sources");
const colors = read("filament_colors");
const templates = read("email_templates");
const wishlist = read("wishlist_items");
const onLoan = INCLUDE_ON_LOAN ? read("on_loan") : [];

// 1. Sources: reuse a same-named source that already exists in the new project (e.g. the default "כללי").
const { data: existingSources, error: srcErr } = await db.from("item_sources").select("id, name");
if (srcErr) throw srcErr;
const byName = new Map(existingSources.map((s) => [s.name.trim().toLowerCase(), s.id]));
const sourceId = new Map();
const newSources = [];
for (const s of sources) {
  const existing = byName.get(s.name.trim().toLowerCase());
  sourceId.set(s.id, existing ?? s.id);
  if (!existing || existing === s.id) {
    newSources.push({ id: s.id, name: s.name, description: s.description, is_active: s.is_active, sort_order: s.sort_order });
  }
}
log(`item_sources: ${newSources.length} to upsert, ${sources.length - newSources.length} matched existing`);
if (!DRY && newSources.length) check(await db.from("item_sources").upsert(newSources), "item_sources");

// 2. Items (quantities start at 0; the sync triggers compute them from catalog_item_sources).
const OLD_MARKER = "/storage/v1/object/public/catalog-images/";
let copied = 0;
const itemRows = [];
for (const it of items) {
  let imageUrl = it.image_url;
  const i = imageUrl?.indexOf(OLD_MARKER) ?? -1;
  if (imageUrl && i !== -1 && !imageUrl.startsWith(SUPABASE_URL)) {
    const path = decodeURIComponent(imageUrl.slice(i + OLD_MARKER.length));
    if (!DRY) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`download ${imageUrl}: ${res.status}`);
      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      const up = await db.storage.from("catalog-images").upload(path, await res.arrayBuffer(), { contentType, upsert: true });
      check(up, `upload ${path}`);
      imageUrl = db.storage.from("catalog-images").getPublicUrl(path).data.publicUrl;
    }
    copied++;
  }
  itemRows.push({
    id: it.id,
    name: it.name,
    description: it.description,
    image_url: imageUrl,
    category: it.category ?? "other",
    created_at: it.created_at,
    quantity_total: 0,
    quantity_available: 0,
  });
}
log(`catalog_items: ${itemRows.length} to upsert (${copied} images copied to the new bucket)`);
if (!DRY) check(await db.from("catalog_items").upsert(itemRows), "catalog_items");

// 3. Stock per source (+ optionally what was out on loan, returned to the source it came from).
const qty = new Map(); // `${item}|${source}` -> quantity
const add = (item, source, n) => {
  const key = `${item}|${sourceId.get(source) ?? source}`;
  qty.set(key, (qty.get(key) ?? 0) + n);
};
for (const r of itemSources) add(r.item_id, r.source_id, r.quantity);
for (const loan of onLoan) {
  for (const li of loan.lend_request_items) {
    for (const lris of li.lend_request_item_sources ?? []) add(li.item_id, lris.source_id, lris.quantity);
  }
}
const stockRows = [...qty].map(([key, quantity]) => {
  const [item_id, source_id] = key.split("|");
  return { item_id, source_id, quantity };
});
log(`catalog_item_sources: ${stockRows.length} to upsert${INCLUDE_ON_LOAN ? " (including on-loan units)" : ""}`);
if (!DRY) check(await db.from("catalog_item_sources").upsert(stockRows, { onConflict: "item_id,source_id" }), "catalog_item_sources");

// 4. Lookups: the old project's filament colors replace the seeded defaults; templates update by key.
log(`filament_colors: replacing seeded defaults with ${colors.length} exported colors`);
if (!DRY && colors.length) {
  check(await db.from("filament_colors").delete().not("id", "in", `(${colors.map((c) => c.id).join(",")})`), "filament_colors cleanup");
  check(await db.from("filament_colors").upsert(colors.map(({ id, name, hex, is_active, sort_order }) => ({ id, name, hex, is_active, sort_order }))), "filament_colors");
}
log(`email_templates: ${templates.length} to upsert by key`);
if (!DRY && templates.length) {
  check(await db.from("email_templates").upsert(
    templates.map(({ key, label, subject, body }) => ({ key, label, subject, body })),
    { onConflict: "key" },
  ), "email_templates");
}
// created_by pointed at old user ids, which don't exist here.
log(`wishlist_items: ${wishlist.length} to upsert`);
if (!DRY && wishlist.length) {
  check(await db.from("wishlist_items").upsert(
    wishlist.map(({ id, name, description, link, estimated_cost, quantity_pref, created_at }) =>
      ({ id, name, description, link: /^https?:\/\/\S+$/i.test(link ?? "") ? link : null, estimated_cost, quantity_pref, created_at })),
  ), "wishlist_items");
}

if (!DRY) {
  const { data } = await db.from("catalog_items").select("quantity_available");
  const units = (data ?? []).reduce((s, r) => s + r.quantity_available, 0);
  console.log(`\nDone. ${data?.length ?? 0} items, ${units} units on the shelf.`);
}
