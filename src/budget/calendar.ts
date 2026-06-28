/**
 * Money-calendar logic: when recurring events fall, and period totals. Pure and
 * deterministic — operates on 'YYYY-MM-DD' local dates. Integer sen.
 */
import { addSen, type Sen } from '../money/money';
import { addDaysISO, daysInMonth, dayOfWeekMon0, parseISO } from './dates';
import type { EventType, RecurringEvent } from '../model/types';

const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** Income is money IN; everything else is money OUT. */
export function eventDirection(type: EventType): 'in' | 'out' {
  return type === 'income' ? 'in' : 'out';
}

/** Does an event occur on the given local date? */
export function occursOn(ev: RecurringEvent, dateISO: string): boolean {
  const { year, month, day } = parseISO(dateISO);
  const dim = daysInMonth(year, month);
  switch (ev.freq) {
    case 'monthly':
      return day === Math.min(Math.max(ev.dayOfMonth ?? 1, 1), dim);
    case 'yearly':
      return ev.month === month && day === Math.min(Math.max(ev.dayOfMonth ?? 1, 1), dim);
    case 'weekly':
      return dayOfWeekMon0(dateISO) === (ev.weekday ?? 0);
    case 'once':
      return ev.dateISO === dateISO;
    default:
      return false;
  }
}

export function eventsOnDate(events: RecurringEvent[], dateISO: string): RecurringEvent[] {
  return events.filter((e) => occursOn(e, dateISO));
}

export interface DayEvents {
  day: number;
  dateISO: string;
  events: RecurringEvent[];
}

/** Day-by-day events for a month, only for days that have any (sorted by day). */
export function monthList(events: RecurringEvent[], year: number, month: number): DayEvents[] {
  const out: DayEvents[] = [];
  const dim = daysInMonth(year, month);
  for (let day = 1; day <= dim; day++) {
    const dateISO = isoOf(year, month, day);
    const evs = eventsOnDate(events, dateISO);
    if (evs.length) out.push({ day, dateISO, events: evs });
  }
  return out;
}

export interface PeriodSummary {
  inSen: Sen;
  outSen: Sen;
  netSen: Sen;
  count: number;
}

/** Sum income vs outflow across a set of day-buckets. */
export function summarize(days: DayEvents[]): PeriodSummary {
  let inSen = 0;
  let outSen = 0;
  let count = 0;
  for (const d of days) {
    for (const e of d.events) {
      count++;
      if (eventDirection(e.type) === 'in') inSen = addSen(inSen, e.amountSen);
      else outSen = addSen(outSen, e.amountSen);
    }
  }
  return { inSen, outSen, netSen: inSen - outSen, count };
}

/** Signed net flow on a single date: income adds, everything else subtracts. */
export function dayNet(events: RecurringEvent[], dateISO: string): Sen {
  let net = 0;
  for (const e of eventsOnDate(events, dateISO)) {
    net += eventDirection(e.type) === 'in' ? e.amountSen : -e.amountSen;
  }
  return net;
}

/**
 * Forward, day-by-day projected balance starting from `anchorSen` as the balance
 * BEFORE `fromISO`. The value for each date is the balance after that day's
 * events. Inclusive of both ends; capped to avoid runaway loops.
 */
export function projectBalances(
  events: RecurringEvent[],
  anchorSen: Sen,
  fromISO: string,
  toISO: string,
): Map<string, Sen> {
  const out = new Map<string, Sen>();
  let bal = anchorSen;
  let cur = fromISO;
  for (let i = 0; i < 800 && cur <= toISO; i++) {
    bal += dayNet(events, cur);
    out.set(cur, bal);
    cur = addDaysISO(cur, 1);
  }
  return out;
}
