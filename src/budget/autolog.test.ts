import { describe, it, expect } from 'vitest';
import { pendingMaterializations } from './autolog';
import type { RecurringEvent } from '../model/types';

const ev = (p: Partial<RecurringEvent>): RecurringEvent => ({
  id: 'x',
  name: 'e',
  type: 'subscription',
  amountSen: 1000,
  freq: 'monthly',
  ...p,
});

describe('pendingMaterializations', () => {
  const events: RecurringEvent[] = [
    ev({ id: 'netflix', name: 'Netflix', type: 'subscription', amountSen: 5500, dayOfMonth: 10 }),
    ev({ id: 'salary', name: 'Salary', type: 'income', amountSen: 650_000, dayOfMonth: 10 }),
    ev({ id: 'asb', name: 'ASB', type: 'savings', amountSen: 20_000, dayOfMonth: 10 }),
    ev({ id: 'card', name: 'Card', type: 'creditcard', amountSen: 30_000, dayOfMonth: 12 }),
  ];

  it('materializes only outflow expense types', () => {
    const out = pendingMaterializations(events, [], '2026-06-01', '2026-06-30');
    const ids = out.map((m) => m.eventId).sort();
    expect(ids).toEqual(['card', 'netflix']); // income + savings excluded
  });

  it('skips already-materialized keys (idempotent)', () => {
    const done = ['netflix:2026-06-10'];
    const out = pendingMaterializations(events, done, '2026-06-01', '2026-06-30');
    expect(out.map((m) => m.key)).toEqual(['card:2026-06-12']);
  });

  it('respects the window start (no pre-enable backfill)', () => {
    const out = pendingMaterializations(events, [], '2026-06-11', '2026-06-30');
    expect(out.map((m) => m.eventId)).toEqual(['card']); // Netflix on the 10th is before the window
  });

  it('ignores zero-amount events and returns nothing when start is after today', () => {
    const zero = [ev({ id: 'z', type: 'bill', amountSen: 0, dayOfMonth: 5 })];
    expect(pendingMaterializations(zero, [], '2026-06-01', '2026-06-30')).toEqual([]);
    expect(pendingMaterializations(events, [], '2026-07-01', '2026-06-30')).toEqual([]);
  });
});
