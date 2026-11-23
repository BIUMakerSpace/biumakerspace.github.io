const DAY_MS = 24 * 60 * 60 * 1000;

/** "8.10.2026" style date, or an em dash for missing values. */
export function formatDateHe(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("he-IL") : "—";
}

/** Date and time in Hebrew locale, or an em dash for missing values. */
export function formatDateTimeHe(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString("he-IL") : "—";
}

/** Whole days elapsed since `iso` (0 for missing values). */
export function daysSince(iso: string | null | undefined, now: number = Date.now()): number {
  return iso ? Math.floor((now - new Date(iso).getTime()) / DAY_MS) : 0;
}
