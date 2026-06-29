/**
 * Resolve the active budgeting period from the user's pay-schedule config.
 * Pay-cycle budgeting runs payday → next payday, so when paydays drift (e.g. paid
 * the 20th in June but the 30th in July) the budget stretches over the longer gap.
 * Pure/deterministic — operates on 'YYYY-MM-DD' local dates, integer day counts.
 */
import { daysInMonth, daysBetweenISO, parseISO } from './dates';
import { previousWorkingDay } from './holidays';
import type { MalaysianState, PayPeriodConfig } from '../model/types';

export interface PayPeriod {
  startISO: string; // inclusive
  endISO: string; // exclusive (next period's start)
  daysInPeriod: number;
  daysElapsed: number; // including today
  daysRemaining: number; // including today, up to (not incl.) endISO
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const ym = (y: number, m: number) => `${y}-${pad(m)}`;

/**
 * Payday for a given month: a per-month override if set, else the configured day
 * (clamped to month length). When `cfg.adjustForHolidays` is on, a day-of-month
 * payday that lands on a weekend or public holiday is brought forward to the
 * preceding working day (per `state`). Explicit per-month overrides are never moved.
 */
export function paydayForMonth(
  cfg: PayPeriodConfig,
  year: number,
  month: number,
  state?: MalaysianState,
): string {
  const override = cfg.customDates[ym(year, month)];
  if (override) return override;
  const dim = daysInMonth(year, month);
  const base = iso(year, month, Math.min(Math.max(cfg.dayOfMonth, 1), dim));
  return cfg.adjustForHolidays ? previousWorkingDay(base, state) : base;
}

/** The budgeting period containing `todayISO`. */
export function currentPayPeriod(cfg: PayPeriodConfig, todayISO: string, state?: MalaysianState): PayPeriod {
  const { year, month } = parseISO(todayISO);
  let startISO: string;
  let endISO: string;

  if (cfg.mode === 'calendarMonth') {
    startISO = iso(year, month, 1);
    endISO = month === 12 ? iso(year + 1, 1, 1) : iso(year, month + 1, 1);
  } else {
    const thisPayday = paydayForMonth(cfg, year, month, state);
    if (todayISO >= thisPayday) {
      startISO = thisPayday;
      endISO = month === 12 ? paydayForMonth(cfg, year + 1, 1, state) : paydayForMonth(cfg, year, month + 1, state);
    } else {
      startISO = month === 1 ? paydayForMonth(cfg, year - 1, 12, state) : paydayForMonth(cfg, year, month - 1, state);
      endISO = thisPayday;
    }
  }

  const daysInPeriod = Math.max(1, daysBetweenISO(startISO, endISO));
  const daysElapsed = daysBetweenISO(startISO, todayISO) + 1;
  const daysRemaining = Math.max(1, daysBetweenISO(todayISO, endISO));
  return { startISO, endISO, daysInPeriod, daysElapsed, daysRemaining };
}
