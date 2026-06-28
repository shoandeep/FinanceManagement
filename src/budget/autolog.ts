/**
 * Auto-materialize recurring OUTFLOW events into the expense ledger so the
 * predictable money (subscriptions, BNPL, card dues, bills) logs itself. Income,
 * savings and investment events stay calendar-only — they aren't spending and
 * shouldn't inflate the variable budget.
 *
 * Idempotent: each (eventId, date) is materialized at most once, tracked by a key
 * in AppData.materializedKeys. Pure — returns what to create; the caller applies it.
 */
import { occursOn } from './calendar';
import { addDaysISO } from './dates';
import type { EventType, RecurringEvent } from '../model/types';

const AUTO_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  'subscription',
  'bnpl',
  'creditcard',
  'bill',
]);

export interface Materialization {
  key: string; // `${eventId}:${dateISO}`
  eventId: string;
  name: string;
  amountSen: number;
  dateISO: string;
}

/**
 * Occurrences in [startISO, todayISO] (inclusive) of auto-loggable events that
 * haven't been materialized yet.
 */
export function pendingMaterializations(
  events: RecurringEvent[],
  doneKeys: string[],
  startISO: string,
  todayISO: string,
): Materialization[] {
  const done = new Set(doneKeys);
  const out: Materialization[] = [];
  if (startISO > todayISO) return out;
  for (let cur = startISO; cur <= todayISO; cur = addDaysISO(cur, 1)) {
    for (const ev of events) {
      if (!AUTO_TYPES.has(ev.type)) continue;
      if (ev.amountSen <= 0) continue;
      if (!occursOn(ev, cur)) continue;
      const key = `${ev.id}:${cur}`;
      if (done.has(key)) continue;
      out.push({ key, eventId: ev.id, name: ev.name, amountSen: ev.amountSen, dateISO: cur });
    }
  }
  return out;
}
