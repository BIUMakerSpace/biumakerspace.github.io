export type CatalogCategory = "sensors" | "tools" | "microcontrollers" | "other";

export const CATEGORIES: CatalogCategory[] = ["sensors", "tools", "microcontrollers", "other"];

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  sensors: "חיישנים",
  tools: "כלים",
  microcontrollers: "בקרים",
  other: "אחר",
};

export const normalizeCategory = (v: unknown): CatalogCategory => {
  const s = String(v ?? "").trim().toLowerCase();
  return (CATEGORIES as string[]).includes(s) ? (s as CatalogCategory) : "other";
};
