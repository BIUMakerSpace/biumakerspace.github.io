import { describe, expect, it } from "vitest";
import {
  combineWorkshops,
  fromIsraelInputValue,
  meetingDate,
  meetingState,
  meetingTime,
  meetingWeekday,
  toIsraelInputValue,
  type MeetingRow,
  type WorkshopRow,
} from "./workshops";

const now = new Date("2026-11-23T12:00:00Z");
const base = { is_cancelled: false, starts_at: "2026-12-07T16:00:00Z", capacity: 12, registered_count: 3 };

describe("meetingState", () => {
  it("is available with free seats before the start", () => expect(meetingState(base, now)).toBe("available"));
  it("is full at capacity", () => expect(meetingState({ ...base, registered_count: 12 }, now)).toBe("full"));
  it("is past once started", () =>
    expect(meetingState({ ...base, starts_at: "2026-11-23T12:00:00Z" }, now)).toBe("past"));
  it("cancelled wins over everything", () =>
    expect(meetingState({ ...base, is_cancelled: true, registered_count: 12 }, now)).toBe("cancelled"));
});

describe("Israel-time formatting", () => {
  // 16:00 UTC on 7 Dec 2026 = 18:00 in Israel (winter, UTC+2), a Monday.
  const iso = "2026-12-07T16:00:00Z";
  it("formats the date", () => expect(meetingDate(iso)).toBe("7.12"));
  it("formats the weekday", () => expect(meetingWeekday(iso)).toBe("יום שני"));
  it("formats the time", () => expect(meetingTime(iso)).toBe("18:00"));
});

describe("datetime-local conversion", () => {
  it("reads winter wall time as UTC+2", () =>
    expect(fromIsraelInputValue("2026-12-07T18:00")).toBe("2026-12-07T16:00:00.000Z"));
  it("reads summer wall time as UTC+3", () =>
    expect(fromIsraelInputValue("2026-07-06T18:00")).toBe("2026-07-06T15:00:00.000Z"));
  it("round-trips", () => {
    for (const v of ["2026-12-07T18:00", "2026-07-06T09:30", "2027-03-29T18:00"]) {
      expect(toIsraelInputValue(fromIsraelInputValue(v))).toBe(v);
    }
  });
  it("rejects malformed input", () => expect(() => fromIsraelInputValue("7/12 18:00")).toThrow());
});

describe("combineWorkshops", () => {
  const w = (id: string, sort_order: number): WorkshopRow => ({
    id, sort_order, title: id, description: "", image_url: null, notice: null, is_published: true,
    created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
  });
  const m = (id: string, workshop_id: string, starts_at: string): MeetingRow => ({
    id, workshop_id, starts_at, title: id, capacity: 12, is_cancelled: false,
    created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
  });

  it("orders workshops and meetings and attaches seat counts", () => {
    const result = combineWorkshops(
      [w("b", 2), w("a", 1)],
      [m("a2", "a", "2026-12-14T16:00:00Z"), m("a1", "a", "2026-12-07T16:00:00Z"), m("b1", "b", "2026-12-08T16:00:00Z")],
      [{ meeting_id: "a1", registered_count: 5, is_registered: true }],
    );
    expect(result.map((x) => x.id)).toEqual(["a", "b"]);
    expect(result[0].meetings.map((x) => x.id)).toEqual(["a1", "a2"]);
    expect(result[0].meetings[0]).toMatchObject({ registered_count: 5, is_registered: true });
    expect(result[0].meetings[1]).toMatchObject({ registered_count: 0, is_registered: false });
  });
});
