export type CatalogCategory =
  | "sensors"
  | "actuators"
  | "displays"
  | "leds"
  | "input"
  | "microcontrollers"
  | "communication"
  | "storage_memory"
  | "passive_components"
  | "wires_connectors"
  | "power"
  | "tools"
  | "other";

export const CATEGORIES: CatalogCategory[] = [
  "sensors",
  "actuators",
  "displays",
  "leds",
  "input",
  "microcontrollers",
  "communication",
  "storage_memory",
  "passive_components",
  "wires_connectors",
  "power",
  "tools",
  "other",
];

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  sensors: "חיישנים",
  actuators: "מנועים והפעלה",
  displays: "תצוגות",
  leds: "לדים ותאורה",
  input: "קלט וממשק",
  microcontrollers: "בקרים וערכות",
  communication: "תקשורת",
  storage_memory: "אחסון וזיכרון",
  passive_components: "רכיבים פסיביים",
  wires_connectors: "חוטים ומחברים",
  power: "מתח והספק",
  tools: "כלים ואביזרים",
  other: "אחר",
};

export const normalizeCategory = (v: unknown): CatalogCategory => {
  const s = String(v ?? "").trim().toLowerCase();
  return (CATEGORIES as string[]).includes(s) ? (s as CatalogCategory) : "other";
};

// ---- General (high-level) categories ----
export type GeneralCategory =
  | "sensors"
  | "electronics"
  | "compute"
  | "connectivity_power"
  | "tools_other";

export const GENERAL_CATEGORIES: GeneralCategory[] = [
  "sensors",
  "electronics",
  "compute",
  "connectivity_power",
  "tools_other",
];

export const GENERAL_CATEGORY_LABELS: Record<GeneralCategory, string> = {
  sensors: "חיישנים",
  electronics: "אלקטרוניקה",
  compute: "בקרים וזיכרון",
  connectivity_power: "חיבורים ומתח",
  tools_other: "כלים ואחר",
};

// Map detailed category -> general category (mirror of DB backfill)
export const CATEGORY_TO_GENERAL: Record<CatalogCategory, GeneralCategory> = {
  sensors: "sensors",
  actuators: "electronics",
  displays: "electronics",
  leds: "electronics",
  input: "electronics",
  communication: "electronics",
  passive_components: "electronics",
  microcontrollers: "compute",
  storage_memory: "compute",
  wires_connectors: "connectivity_power",
  power: "connectivity_power",
  tools: "tools_other",
  other: "tools_other",
};

export const normalizeGeneralCategory = (v: unknown): GeneralCategory => {
  const s = String(v ?? "").trim().toLowerCase();
  return (GENERAL_CATEGORIES as string[]).includes(s) ? (s as GeneralCategory) : "tools_other";
};
