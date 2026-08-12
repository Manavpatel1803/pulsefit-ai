import { describe, expect, it } from "vitest";
import { localDateString } from "./date";

describe("localDateString", () => {
  it("formats as YYYY-MM-DD using local calendar fields, not UTC", () => {
    // Constructed from local fields, so this must round-trip regardless of the
    // machine's timezone — this is the exact bug class the app hit before
    // (mixing toISOString() with local-time arithmetic shifted "today" by a day).
    const d = new Date(2026, 0, 5); // Jan 5 2026, local time
    expect(localDateString(d)).toBe("2026-01-05");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 8, 3); // Sept 3 2026
    expect(localDateString(d)).toBe("2026-09-03");
  });

  it("defaults to the current moment when no date is passed", () => {
    const result = localDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
