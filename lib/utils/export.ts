const FORMULA_START_RE = /^[=+\-@\t\r]/;
const QUOTE_RE = /"/g;
const ICS_SPECIAL_RE = /[\\;,]/g;
const NEWLINE_RE = /\r\n|\r|\n/g;

/**
 * A quoted CSV cell. Cells starting with a formula character get a leading
 * apostrophe so spreadsheets show user-supplied text instead of running it
 * (OWASP CSV injection guidance).
 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA_START_RE.test(text) ? `'${text}` : text;
  return `"${safe.replace(QUOTE_RE, '""')}"`;
}

/**
 * An iCalendar TEXT value (RFC 5545 §3.3.11). Escaping newlines keeps
 * user-supplied text from starting new calendar properties.
 */
export function icsText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(ICS_SPECIAL_RE, (c) => `\\${c}`)
    .replace(NEWLINE_RE, "\\n");
}
