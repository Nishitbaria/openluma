const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const DAY_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A `YYYY-MM-DD` param (what the date inputs send) as a UTC day, or null. */
function parseDayParam(value: string | undefined) {
  if (!(value && DAY_PARAM_RE.test(value))) {
    return null;
  }
  const day = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(day.getTime()) ? null : day;
}

/**
 * The insights date range: `dateTo` includes that whole day, the default is
 * the last 30 days, and the range is capped so the per-day chart stays small.
 */
export function resolveDateRange(dateFrom?: string, dateTo?: string) {
  const toDay = parseDayParam(dateTo);
  const to = toDay ? new Date(toDay.getTime() + DAY_MS - 1) : new Date();
  const fromDay = parseDayParam(dateFrom);
  if (!fromDay || fromDay > to) {
    return { from: new Date(to.getTime() - 30 * DAY_MS), to };
  }
  const earliest = new Date(to.getTime() - MAX_RANGE_DAYS * DAY_MS);
  return { from: fromDay < earliest ? earliest : fromDay, to };
}
