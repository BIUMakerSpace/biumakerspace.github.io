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
