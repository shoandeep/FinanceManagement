import { describe, it, expect } from 'vitest';
import { applyTransferEffect, transfersFor, totalTransferred } from './transfers';
import { createDefaultAppData } from '../model/defaults';
import type { AppData, Transfer } from '../model/types';

function seed(): AppData {
  const d = createDefaultAppData();
  d.cashAccounts = [
    { id: 'c1', name: 'RYT Bank', type: 'bank', balanceSen: 100_000, ratePercent: 0 },
    { id: 'c2', name: 'TNG eWallet', type: 'ewallet', balanceSen: 0, ratePercent: 0 },
  ];
  d.investments = [{ id: 'i1', name: 'ASB', currentSen: 200_000 }];
  return d;
}

const tx = (p: Partial<Transfer>): Transfer => ({
  id: 't',
  kind: 'cash',
  targetId: 'c1',
  amountSen: 10_000,
  dateISO: '2026-06-29',
  ...p,
});

describe('applyTransferEffect', () => {
  it('adds to and reverses a cash account balance', () => {
    const d = seed();
    const t = tx({ targetId: 'c1', amountSen: 25_000 });
    applyTransferEffect(d, t, 1);
    expect(d.cashAccounts[0].balanceSen).toBe(125_000);
    applyTransferEffect(d, t, -1);
    expect(d.cashAccounts[0].balanceSen).toBe(100_000); // back to start
  });
  it('routes to investments by kind', () => {
    const d = seed();
    applyTransferEffect(d, tx({ kind: 'investment', targetId: 'i1', amountSen: 30_000 }), 1);
    expect(d.investments[0].currentSen).toBe(230_000);
  });
  it('is a no-op when the target no longer exists', () => {
    const d = seed();
    const before = JSON.stringify(d);
    applyTransferEffect(d, tx({ targetId: 'gone', amountSen: 9_999 }), 1);
    expect(JSON.stringify(d)).toBe(before);
  });
  it('an edit = reverse old then apply new (net delta only)', () => {
    const d = seed();
    const t = tx({ targetId: 'c1', amountSen: 10_000 });
    applyTransferEffect(d, t, 1); // 110_000
    applyTransferEffect(d, t, -1); // reverse old
    t.amountSen = 40_000;
    applyTransferEffect(d, t, 1); // apply new
    expect(d.cashAccounts[0].balanceSen).toBe(140_000);
  });
});

describe('transfersFor / totalTransferred', () => {
  const list: Transfer[] = [
    tx({ id: 'a', targetId: 'c1', amountSen: 10_000, dateISO: '2026-06-01' }),
    tx({ id: 'b', targetId: 'c1', amountSen: 20_000, dateISO: '2026-06-20' }),
    tx({ id: 'c', targetId: 'c2', amountSen: 5_000, dateISO: '2026-06-10' }),
    tx({ id: 'd', kind: 'investment', targetId: 'i1', amountSen: 7_000, dateISO: '2026-06-15' }),
  ];
  it('filters by kind+target, newest first', () => {
    expect(transfersFor(list, 'cash', 'c1').map((t) => t.id)).toEqual(['b', 'a']);
    expect(transfersFor(list, 'cash', 'c2').map((t) => t.id)).toEqual(['c']);
    expect(transfersFor(list, 'investment', 'i1').map((t) => t.id)).toEqual(['d']);
  });
  it('sums the amounts for a target', () => {
    expect(totalTransferred(list, 'cash', 'c1')).toBe(30_000);
    expect(totalTransferred(list, 'investment', 'i1')).toBe(7_000);
  });
});
