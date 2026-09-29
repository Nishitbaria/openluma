import { describe, expect, test } from "bun:test";
import { csvCell, icsText } from "./export.ts";

const NEWLINE_RE = /[\r\n]/;

describe("csvCell", () => {
  test("neutralizes formula prefixes and escapes quotes", () => {
    expect(csvCell('=HYPERLINK("http://x","a")')).toBe(
      `"'=HYPERLINK(""http://x"",""a"")"`
    );
    for (const p of ["+", "-", "@", "\t", "\r"]) {
      expect(csvCell(`${p}1`)).toBe(`"'${p}1"`);
    }
    expect(csvCell('Ann "A"')).toBe('"Ann ""A"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(false)).toBe('"false"');
  });
});

describe("icsText", () => {
  test("escapes separators and newlines so no property can be injected", () => {
    const out = icsText("Party\r\nATTENDEE:mailto:x@evil.com; a,b\\c");
    expect(out).toBe(String.raw`Party\nATTENDEE:mailto:x@evil.com\; a\,b\\c`);
    expect(out).not.toMatch(NEWLINE_RE);
    expect(icsText("a\rb\nc")).toBe("a\\nb\\nc");
    expect(icsText(null)).toBe("");
  });
});
