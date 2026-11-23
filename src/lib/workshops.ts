import type { Tables } from "@/integrations/supabase/types";

export type WorkshopRow = Tables<"workshops">;
export type MeetingRow = Tables<"workshop_meetings">;

export interface Meeting extends MeetingRow {
  registered_count: number;
  is_registered: boolean;
}

export interface Workshop extends WorkshopRow {
  meetings: Meeting[];
}

export interface MeetingStats {
  meeting_id: string;
  registered_count: number;
  is_registered: boolean;
}

export type MeetingState = "available" | "full" | "cancelled" | "past";

/** Meetings happen in Israel; show and enter times in Israel time whatever the browser's zone. */
export const WORKSHOP_TIME_ZONE = "Asia/Jerusalem";

export function meetingState(
  m: Pick<Meeting, "is_cancelled" | "starts_at" | "capacity" | "registered_count">,
  now: Date = new Date(),
): MeetingState {
  if (m.is_cancelled) return "cancelled";
  if (new Date(m.starts_at).getTime() <= now.getTime()) return "past";
  if (m.registered_count >= m.capacity) return "full";
  return "available";
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("he-IL", { timeZone: WORKSHOP_TIME_ZONE, ...options });
const dateFmt = fmt({ day: "numeric", month: "numeric" });
const weekdayFmt = fmt({ weekday: "long" });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "7.12" */
export const meetingDate = (iso: string) => dateFmt.format(new Date(iso));
/** "יום שני" */
export const meetingWeekday = (iso: string) => weekdayFmt.format(new Date(iso));
/** "18:00" */
export const meetingTime = (iso: string) => timeFmt.format(new Date(iso));

/** Workshops in display order, each with its meetings (by date) and their seat counts. */
export function combineWorkshops(
  workshops: WorkshopRow[],
  meetings: MeetingRow[],
  stats: MeetingStats[],
): Workshop[] {
  const statsById = new Map(stats.map((s) => [s.meeting_id, s]));
  return [...workshops]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((w) => ({
      ...w,
      meetings: meetings
        .filter((m) => m.workshop_id === w.id)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((m) => ({
          ...m,
          registered_count: statsById.get(m.id)?.registered_count ?? 0,
          is_registered: statsById.get(m.id)?.is_registered ?? false,
        })),
    }));
}

// ---------------------------------------------------------------------------
// <input type="datetime-local"> values ("2026-12-07T18:00") interpreted in Israel time
// ---------------------------------------------------------------------------

/** Offset of Israel time from UTC at `instant`, in minutes (120 in winter, 180 in summer). */
function israelOffsetMinutes(instant: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: WORKSHOP_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - instant) / 60_000);
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in Israel time, for a datetime-local input. */
export function toIsraelInputValue(iso: string): string {
  const t = new Date(iso).getTime();
  const local = new Date(t + israelOffsetMinutes(t) * 60_000);
  return local.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" read as Israel wall-clock time -> ISO timestamp (UTC). */
export function fromIsraelInputValue(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error(`Invalid date-time: ${value}`);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes settle the offset correctly around daylight-saving changes.
  let utc = wall - israelOffsetMinutes(wall) * 60_000;
  utc = wall - israelOffsetMinutes(utc) * 60_000;
  return new Date(utc).toISOString();
}
