import { describe, expect, it } from "vitest";
import { CATALOG_CSV_HEADERS, parseCatalogCsv, parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded commas/newlines and CRLF", () => {
    const text = 'a,"b, c","say ""hi"""\r\n"multi\nline",x,\r\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["multi\nline", "x", ""],
    ]);
  });

  it("skips blank lines and handles a missing trailing newline", () => {
    expect(parseCsv("a,b\n\n\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("round-trips through toCsv", () => {
    const rows = [["שם", 'עם "מרכאות"', "a,b"], ["x", 5, "שורה\nחדשה"]];
    const parsed = parseCsv(toCsv(rows).replace(/^\uFEFF/, ""));
    expect(parsed).toEqual(rows.map((r) => r.map(String)));
  });
});

describe("parseCatalogCsv", () => {
  const header = CATALOG_CSV_HEADERS.join(",");

  it("maps rows to records and normalizes categories", () => {
    const csv = `\uFEFF${header}\nמברג,תיאור,TOOLS,5,3,https://x/img.png\nלד,,unknown,2,,`;
    expect(parseCatalogCsv(csv)).toEqual([
      { name: "מברג", description: "תיאור", category: "tools", quantity: 3, image_url: "https://x/img.png" },
      { name: "לד", description: null, category: "other", quantity: 0, image_url: null },
    ]);
  });

  it("caps available at total and never goes negative", () => {
    const csv = "name,quantity_total,quantity_available\nA,2,9\nB,-4,-1";
    expect(parseCatalogCsv(csv).map((r) => r.quantity)).toEqual([2, 0]);
  });

  it("defaults quantity to the total, or 1 without quantity columns", () => {
    expect(parseCatalogCsv("name,quantity_total\nA,4")[0].quantity).toBe(4);
    expect(parseCatalogCsv("name\nA")[0].quantity).toBe(1);
  });

  it("rejects unusable files with a message", () => {
    expect(() => parseCatalogCsv("")).toThrow("הקובץ ריק");
    expect(() => parseCatalogCsv("title\nA")).toThrow("חסרה עמודת name");
    expect(() => parseCatalogCsv("name,description\n,just a description")).toThrow("אין שורות תקינות");
  });
});
