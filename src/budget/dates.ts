/**
 * Date helpers for the monthly budgeting logic. All functions operate on local
 * calendar dates expressed as 'YYYY-MM-DD' strings, so they are timezone-stable
 * and fully deterministic for testing (no Date math across DST boundaries).
 */

export interface YMD {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export function parseISO(dateISO: string): YMD {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) throw new Error(`Invalid ISO date: ${dateISO}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** The 'YYYY-MM' month bucket for an ISO date. */
export function monthKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** Number of days in a given month (1-based month). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Days remaining in the month INCLUDING today (today counts as 1). */
export function daysRemainingInMonth(todayISO: string): number {
  const { year, month, day } = parseISO(todayISO);
  return daysInMonth(year, month) - day + 1;
}

/**
 * Whole months from `fromISO` to `toISO`. Negative if `to` is in the past.
 * A full month requires the day-of-month to have been reached.
 */
export function wholeMonthsBetween(fromISO: string, toISO: string): number {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  let months = (b.year - a.year) * 12 + (b.month - a.month);
  if (b.day < a.day) months -= 1;
  return months;
}

/** Today's local date as 'YYYY-MM-DD' (runtime use; tests pass explicit dates). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
