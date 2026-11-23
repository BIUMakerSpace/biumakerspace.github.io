import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { safeUrl } from "./url";
import { safeRedirectPath } from "./redirect";
import { getDisplayName } from "./user";
import { daysSince } from "./format";
import { errorMessage } from "./errors";
import { optionalHttpUrl } from "./schemas";

describe("safeUrl", () => {
  it("allows http(s) URLs", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects script and other schemes, relative and malformed URLs", () => {
    for (const bad of ["javascript:alert(1)", " JavaScript:alert(1)", "data:text/html,<b>", "/relative", "nonsense", "", null, undefined]) {
      expect(safeUrl(bad)).toBeUndefined();
    }
  });
});

describe("optionalHttpUrl", () => {
  it("accepts empty or http(s), rejects javascript: (which zod's .url() allows)", () => {
    expect(optionalHttpUrl.safeParse("").success).toBe(true);
    expect(optionalHttpUrl.safeParse("https://shop.example/item").success).toBe(true);
    expect(optionalHttpUrl.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("keeps in-app paths", () => {
    expect(safeRedirectPath("/catalog?x=1", "/home")).toBe("/catalog?x=1");
  });

  it("falls back for missing, absolute, protocol-relative and backslash paths", () => {
    for (const bad of [null, "", "catalog", "https://evil.com", "//evil.com", "/\\evil.com"]) {
      expect(safeRedirectPath(bad, "/home")).toBe("/home");
    }
  });
});

describe("getDisplayName", () => {
  const user = (meta: Record<string, unknown>, email?: string) => ({ user_metadata: meta, email }) as unknown as User;

  it("prefers full_name, then name, then email", () => {
    expect(getDisplayName(user({ full_name: " Dana Levi ", name: "dana" }, "d@x.com"))).toBe("Dana Levi");
    expect(getDisplayName(user({ name: "dana" }, "d@x.com"))).toBe("dana");
    expect(getDisplayName(user({ full_name: "  " }, "d@x.com"))).toBe("d@x.com");
  });

  it("uses the fallback when nothing is known", () => {
    expect(getDisplayName(null)).toBe("מייקר");
    expect(getDisplayName(user({}), "")).toBe("");
  });
});

describe("daysSince", () => {
  it("counts whole days and treats missing dates as 0", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(daysSince("2026-10-01T13:00:00Z", now)).toBe(6);
    expect(daysSince(null, now)).toBe(0);
  });
});

describe("errorMessage", () => {
  it("reads Error, Supabase-style objects and primitives", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage({ message: "row-level security", code: "42501" })).toBe("row-level security");
    expect(errorMessage("plain")).toBe("plain");
  });
});
