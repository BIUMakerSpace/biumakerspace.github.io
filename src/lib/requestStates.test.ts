import { describe, expect, it } from "vitest";
import {
  LEND_EMAIL_KEY, PRINT_EMAIL_KEY, nextLendStatuses, nextPrintStatuses, statusLabel, statusOptions,
} from "./requestStates";

// Keep in sync with the CHECK constraints in supabase/migrations/*_hardening.sql.
const DB_STATUSES = {
  print: ["pending", "approved", "printing", "ready", "completed", "rejected", "cancelled"],
  lend: ["pending", "approved", "delivered", "returned", "rejected", "cancelled"],
  item: ["pending", "approved", "ordered", "received", "rejected"],
} as const;

describe("request status vocabularies", () => {
  it.each(Object.entries(DB_STATUSES))("%s statuses match the database", (kind, statuses) => {
    expect(statusOptions(kind as keyof typeof DB_STATUSES)).toEqual(statuses);
  });

  it("labels every status in Hebrew and passes unknown values through", () => {
    for (const [kind, statuses] of Object.entries(DB_STATUSES)) {
      for (const s of statuses) expect(statusLabel(kind as keyof typeof DB_STATUSES, s)).not.toBe(s);
    }
    expect(statusLabel("lend", "mystery")).toBe("mystery");
  });
});

describe("state machines", () => {
  it("only move to known statuses", () => {
    for (const s of DB_STATUSES.print) for (const n of nextPrintStatuses(s)) expect(DB_STATUSES.print).toContain(n);
    for (const s of DB_STATUSES.lend) for (const n of nextLendStatuses(s)) expect(DB_STATUSES.lend).toContain(n);
  });

  it("terminal states have no transitions", () => {
    expect(nextPrintStatuses("completed")).toEqual([]);
    expect(nextPrintStatuses("cancelled")).toEqual([]);
    expect(nextLendStatuses("returned")).toEqual([]);
    expect(nextLendStatuses("cancelled")).toEqual([]);
  });

  it("delivery only happens from approved, return only from delivered", () => {
    const from = (target: string) => DB_STATUSES.lend.filter((s) => nextLendStatuses(s).includes(target));
    expect(from("delivered")).toEqual(["approved"]);
    expect(from("returned")).toEqual(["delivered"]);
  });

  it("email templates exist only for reachable statuses", () => {
    for (const s of Object.keys(PRINT_EMAIL_KEY)) expect(DB_STATUSES.print).toContain(s);
    for (const s of Object.keys(LEND_EMAIL_KEY)) expect(DB_STATUSES.lend).toContain(s);
  });
});
