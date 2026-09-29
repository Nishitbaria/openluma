import { describe, expect, test } from "bun:test";
import { resolveDateRange } from "./analytics-range.ts";

const DAY = 24 * 60 * 60 * 1000;

describe("resolveDateRange", () => {
  test("uses whole UTC days from the date inputs", () => {
    const { from, to } = resolveDateRange("2026-01-01", "2026-01-31");
    expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-01-31T23:59:59.999Z");
  });

  test("falls back to the last 30 days for missing or malformed input", () => {
    for (const [a, b] of [
      [undefined, undefined],
      ["garbage", "nope"],
      ["2026-13-45", "+275760-09-13"],
      ["-271821-04-20", undefined],
    ]) {
      const { from, to } = resolveDateRange(a, b);
      expect(Number.isNaN(from.getTime())).toBe(false);
      expect(Number.isNaN(to.getTime())).toBe(false);
      expect(Math.round((to - from) / DAY)).toBe(30);
    }
  });

  test("caps huge ranges and rejects reversed ones", () => {
    const wide = resolveDateRange("0001-01-01", "9999-12-31");
    expect((wide.to - wide.from) / DAY).toBeLessThanOrEqual(366);
    const reversed = resolveDateRange("2026-02-01", "2026-01-01");
    expect(reversed.from < reversed.to).toBe(true);
  });
});
