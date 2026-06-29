import { describe, it, expect } from 'vitest';
import { buildTransactions, filterTransactions, totals } from './transactions';
import { createDefaultAppData } from '../model/defaults';
import type { AppData } from '../model/types';

function seed(): AppData {
  const d = createDefaultAppData();
  d.variableCategories = [{ id: 'food', name: 'Food & drinks', sharePercent: 100 }];
  d.cashAccounts = [{ id: 'c1', name: 'RYT Bank', type: 'bank', balanceSen: 0, ratePercent: 0 }];
  d.investments = [{ id: 'i1', name: 'ASB', currentSen: 0 }];
  d.recurringEvents = [
    { id: 'ev1', name: 'Netflix', type: 'subscription', amountSen: 5500, freq: 'monthly', dayOfMonth: 10 },
  ];
  d.expenses = [
    { id: 'e1', categoryId: 'food', amountSen: 4300, dateISO: '2026-06-28', note: 'Lunch' },
    { id: 'e2', categoryId: '', amountSen: 1000, dateISO: '2026-06-29' }, // uncategorised
    { id: 'e3', categoryId: '', amountSen: 5500, dateISO: '2026-06-10', sourceEventId: 'ev1', note: 'Netflix' }, // bill
  ];
  d.transfers = [
    { id: 't1', kind: 'cash', targetId: 'c1', amountSen: 50000, dateISO: '2026-06-26' },
    { id: 't2', kind: 'investment', targetId: 'i1', amountSen: 30000, dateISO: '2026-06-15', note: 'DCA' },
  ];
  return d;
}

describe('buildTransactions', () => {
  const txns = buildTransactions(seed());
  it('merges expenses + transfers, newest first', () => {
    expect(txns.map((t) => t.id)).toEqual(['e2', 'e1', 't1', 't2', 'e3']);
  });
  it('classifies direction and type', () => {
    const by = Object.fromEntries(txns.map((t) => [t.id, t]));
    expect(by.e1).toMatchObject({ direction: 'out', typeKey: 'food', typeLabel: 'Food & drinks' });
    expect(by.e2).toMatchObject({ direction: 'out', typeKey: 'uncat', typeLabel: 'Uncategorised' });
    expect(by.e3).toMatchObject({ direction: 'out', typeKey: 'bill', typeLabel: 'Subscription' });
    expect(by.t1).toMatchObject({ direction: 'in', typeKey: 'transfer', typeLabel: 'Transfer · RYT Bank' });
    expect(by.t2).toMatchObject({ direction: 'in', typeKey: 'transfer', typeLabel: 'Investment · ASB' });
  });
});

describe('filterTransactions', () => {
  const txns = buildTransactions(seed());
  it('filters by direction', () => {
    expect(filterTransactions(txns, { direction: 'in' }).map((t) => t.id).sort()).toEqual(['t1', 't2']);
    expect(filterTransactions(txns, { direction: 'out' }).map((t) => t.id).sort()).toEqual(['e1', 'e2', 'e3']);
  });
  it('filters by type key', () => {
    expect(filterTransactions(txns, { typeKey: 'bill' }).map((t) => t.id)).toEqual(['e3']);
    expect(filterTransactions(txns, { typeKey: 'transfer' }).map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });
  it('filters by date range (inclusive)', () => {
    const r = filterTransactions(txns, { fromISO: '2026-06-26', toISO: '2026-06-28' }).map((t) => t.id).sort();
    expect(r).toEqual(['e1', 't1']);
  });
  it('filters by amount range', () => {
    expect(filterTransactions(txns, { minSen: 30000 }).map((t) => t.id).sort()).toEqual(['t1', 't2']);
    expect(filterTransactions(txns, { maxSen: 4300 }).map((t) => t.id).sort()).toEqual(['e1', 'e2']);
  });
});

describe('totals', () => {
  it('sums in/out/net', () => {
    const t = totals(buildTransactions(seed()));
    expect(t.count).toBe(5);
    expect(t.inSen).toBe(80000); // 50000 + 30000
    expect(t.outSen).toBe(10800); // 4300 + 1000 + 5500
    expect(t.netSen).toBe(69200);
  });
});
