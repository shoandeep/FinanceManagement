import { describe, it, expect } from 'vitest';
import { occursOn, monthList, summarize } from './calendar';
import type { RecurringEvent } from '../model/types';

const ev = (p: Partial<RecurringEvent>): RecurringEvent => ({
  id: 'x',
  name: 'e',
  type: 'subscription',
  amountSen: 0,
  freq: 'monthly',
  ...p,
});

describe('occursOn', () => {
  it('monthly on the given day', () => {
    const e = ev({ freq: 'monthly', dayOfMonth: 15 });
    expect(occursOn(e, '2026-06-15')).toBe(true);
    expect(occursOn(e, '2026-06-14')).toBe(false);
  });

  it('monthly clamps to the last day of short months', () => {
    const e = ev({ freq: 'monthly', dayOfMonth: 31 });
    expect(occursOn(e, '2026-02-28')).toBe(true); // Feb 2026 has 28 days
    expect(occursOn(e, '2026-01-31')).toBe(true);
    expect(occursOn(e, '2026-02-27')).toBe(false);
  });

  it('weekly hits exactly one day per 7', () => {
    const e = ev({ freq: 'weekly', weekday: 2 });
    let hits = 0;
    for (let d = 1; d <= 7; d++) if (occursOn(e, `2026-06-0${d}`)) hits++;
    expect(hits).toBe(1);
  });

  it('yearly only in its month/day', () => {
    const e = ev({ freq: 'yearly', month: 12, dayOfMonth: 25 });
    expect(occursOn(e, '2026-12-25')).toBe(true);
    expect(occursOn(e, '2026-06-25')).toBe(false);
  });

  it('once only on its date', () => {
    const e = ev({ freq: 'once', dateISO: '2026-06-20' });
    expect(occursOn(e, '2026-06-20')).toBe(true);
    expect(occursOn(e, '2026-06-21')).toBe(false);
  });
});

describe('month list + summary', () => {
  const events: RecurringEvent[] = [
    ev({ id: 'pay', type: 'income', name: 'Salary', amountSen: 650_000, dayOfMonth: 25 }),
    ev({ id: 'net', type: 'subscription', name: 'Netflix', amountSen: 5_500, dayOfMonth: 5 }),
    ev({ id: 'atome', type: 'bnpl', name: 'Atome', amountSen: 12_000, dayOfMonth: 5 }),
  ];

  it('groups events by day, sorted', () => {
    const list = monthList(events, 2026, 6);
    expect(list.map((d) => d.day)).toEqual([5, 25]);
    expect(list[0].events.length).toBe(2); // Netflix + Atome on the 5th
  });

  it('summarizes in / out / net', () => {
    const s = summarize(monthList(events, 2026, 6));
    expect(s.inSen).toBe(650_000);
    expect(s.outSen).toBe(17_500); // 5,500 + 12,000
    expect(s.netSen).toBe(632_500);
    expect(s.count).toBe(3);
  });
});
