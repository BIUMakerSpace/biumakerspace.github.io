import { normalizeCategory, type CatalogCategory } from "@/lib/categories";

export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180-ish CSV with a UTF-8 BOM so Excel opens Hebrew correctly. */
export function toCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

/** Parses CSV text into rows of fields; handles quotes, escaped quotes and CRLF. Skips blank lines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const endRow = () => {
    cur.push(field);
    field = "";
    if (cur.some((v) => v !== "")) rows.push(cur);
    cur = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field !== "" || cur.length) endRow();
  return rows;
}

export const CATALOG_CSV_HEADERS = ["name", "description", "category", "quantity_total", "quantity_available", "image_url"];

export interface CatalogCsvRecord {
  name: string;
  description: string | null;
  category: CatalogCategory;
  /** Units on the shelf (a new item can't have any on loan). */
  quantity: number;
  image_url: string | null;
}

/**
 * Parses a catalog CSV (see CATALOG_CSV_HEADERS; only `name` is required).
 * Throws an Error with a Hebrew message for unusable files.
 */
export function parseCatalogCsv(text: string): CatalogCsvRecord[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("הקובץ ריק");
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = (k: string) => headers.indexOf(k);
  const [iName, iDesc, iCat, iTotal, iAvail, iImg] =
    ["name", "description", "category", "quantity_total", "quantity_available", "image_url"].map(col);
  if (iName === -1) throw new Error("חסרה עמודת name");

  const toCount = (v: string | undefined) => Math.max(0, parseInt(v ?? "", 10) || 0);
  const records = rows.slice(1).flatMap((r) => {
    const name = r[iName]?.trim();
    if (!name) return [];
    const total = iTotal !== -1 ? toCount(r[iTotal]) : 1;
    const quantity = iAvail !== -1 ? Math.min(toCount(r[iAvail]), total) : total;
    return [{
      name,
      description: iDesc !== -1 ? r[iDesc]?.trim() || null : null,
      category: iCat !== -1 ? normalizeCategory(r[iCat]) : "other",
      quantity,
      image_url: iImg !== -1 ? r[iImg]?.trim() || null : null,
    }];
  });
  if (!records.length) throw new Error("אין שורות תקינות");
  return records;
}

/** Triggers a browser download of `content`. */
export function downloadText(content: string, filename: string, type = "text/csv;charset=utf-8;") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
