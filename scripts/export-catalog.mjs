// Exports catalog data from the OLD (Lovable-era) Supabase project, using your admin session.
//
//   OLD_SUPABASE_URL=https://<old-ref>.supabase.co \
//   OLD_SUPABASE_ANON_KEY=<old anon/publishable key> \
//   OLD_ACCESS_TOKEN=<access_token of an admin session> \
//   node scripts/export-catalog.mjs
//
// Get OLD_ACCESS_TOKEN by signing in as an admin on the old live site, then in DevTools:
// Application → Local Storage → key "sb-<ref>-auth-token" → copy "access_token" (valid ~1 hour).
// Writes scripts/export/*.json (gitignored; contains admin-only data).
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const { OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY, OLD_ACCESS_TOKEN } = process.env;
if (!OLD_SUPABASE_URL || !OLD_SUPABASE_ANON_KEY || !OLD_ACCESS_TOKEN) {
  console.error("Set OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY and OLD_ACCESS_TOKEN (see header comment).");
  process.exit(1);
}

const old = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${OLD_ACCESS_TOKEN}` } },
});

const OUT = new URL("./export/", import.meta.url);
mkdirSync(OUT, { recursive: true });

async function fetchAll(table, select = "*") {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await old.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const tables = ["catalog_items", "item_sources", "catalog_item_sources", "filament_colors", "email_templates", "wishlist_items"];
for (const table of tables) {
  const rows = await fetchAll(table);
  writeFileSync(new URL(`${table}.json`, OUT), JSON.stringify(rows, null, 2));
  console.log(`${table}: ${rows.length} rows`);
}

// Loans aren't migrated (user accounts can't be), so report what is physically out right now.
const { data: outNow, error: loanError } = await old
  .from("lend_requests")
  .select("id, requester_name, requester_email, requester_phone, delivered_at, lend_request_items(item_id, quantity, catalog_items(name), lend_request_item_sources(source_id, quantity))")
  .eq("status", "delivered");
if (loanError) throw new Error(`lend_requests: ${loanError.message}`);
writeFileSync(new URL("on_loan.json", OUT), JSON.stringify(outNow, null, 2));
console.log(`\n${outNow.length} loans are currently out (saved to scripts/export/on_loan.json):`);
for (const r of outNow) {
  const items = r.lend_request_items.map((li) => `${li.catalog_items?.name} ×${li.quantity}`).join(", ");
  console.log(`  - ${r.requester_name} <${r.requester_email}> ${r.requester_phone}: ${items}`);
}
console.log("\nThese units are NOT counted as stock in the export. Pass --include-on-loan to the import to put them back on the shelf.");
