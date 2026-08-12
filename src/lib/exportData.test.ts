import { describe, expect, it } from "vitest";
import { toCsv } from "./exportData";

describe("toCsv", () => {
  it("writes a header row followed by one row per record, in column order", () => {
    const csv = toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,x\n2,y");
  });

  it("renders null and undefined values as empty fields, not the literal string", () => {
    const csv = toCsv([{ a: null, b: undefined }], ["a", "b"]);
    expect(csv).toBe("a,b\n,");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines per RFC 4180", () => {
    const csv = toCsv([{ notes: 'has, a comma and a "quote"' }], ["notes"]);
    expect(csv).toBe('notes\n"has, a comma and a ""quote"""');
  });
});
