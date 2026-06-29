import { describe, it, expect } from 'vitest';
import { applyTransferEffect, transfersFor, totalTransferred } from './transfers';
import { createDefaultAppData } from '../model/defaults';
import type { AppData, Transfer } from '../model/types';

function seed(): AppData {
  const d = createDefaultAppData();
  d.goals = [
    { id: 'g1', name: 'Wedding', targetSen: 1_000_000, currentSen: 100_000 },
    { id: 'g2', name: 'Car', targetSen: 5_000_000, currentSen: 0 },
  ];
  d.investments = [{ id: 'i1', name: 'ASB', currentSen: 200_000 }];
  d.emergencyFund = { months: 6, currentSen: 50_000 };
  return d;
}

const tx = (p: Partial<Transfer>): Transfer => ({
  id: 't',
  kind: 'savings',
  targetId: 'g1',
  amountSen: 10_000,
  dateISO: '2026-06-29',
  ...p,
});

describe('applyTransferEffect', () => {
  it('adds to and reverses a goal balance', () => {
    const d = seed();
    const t = tx({ targetId: 'g1', amountSen: 25_000 });
    applyTransferEffect(d, t, 1);
    expect(d.goals[0].currentSen).toBe(125_000);
    applyTransferEffect(d, t, -1);
    expect(d.goals[0].currentSen).toBe(100_000); // back to start
  });
  it('routes to investments and the emergency fund by kind', () => {
    const d = seed();
    applyTransferEffect(d, tx({ kind: 'investment', targetId: 'i1', amountSen: 30_000 }), 1);
    expect(d.investments[0].currentSen).toBe(230_000);
    applyTransferEffect(d, tx({ kind: 'emergency', targetId: '', amountSen: 5_000 }), 1);
    expect(d.emergencyFund.currentSen).toBe(55_000);
  });
  it('is a no-op when the target no longer exists', () => {
    const d = seed();
    const before = JSON.stringify(d);
    applyTransferEffect(d, tx({ targetId: 'gone', amountSen: 9_999 }), 1);
    expect(JSON.stringify(d)).toBe(before);
  });
  it('an edit = reverse old then apply new (net delta only)', () => {
    const d = seed();
    const t = tx({ targetId: 'g1', amountSen: 10_000 });
    applyTransferEffect(d, t, 1); // 110_000
    applyTransferEffect(d, t, -1); // reverse old
    t.amountSen = 40_000;
    applyTransferEffect(d, t, 1); // apply new
    expect(d.goals[0].currentSen).toBe(140_000);
  });
});

describe('transfersFor / totalTransferred', () => {
  const list: Transfer[] = [
    tx({ id: 'a', targetId: 'g1', amountSen: 10_000, dateISO: '2026-06-01' }),
    tx({ id: 'b', targetId: 'g1', amountSen: 20_000, dateISO: '2026-06-20' }),
    tx({ id: 'c', targetId: 'g2', amountSen: 5_000, dateISO: '2026-06-10' }),
    tx({ id: 'd', kind: 'investment', targetId: 'i1', amountSen: 7_000, dateISO: '2026-06-15' }),
    tx({ id: 'e', kind: 'emergency', targetId: '', amountSen: 3_000, dateISO: '2026-06-05' }),
  ];
  it('filters by kind+target, newest first', () => {
    expect(transfersFor(list, 'savings', 'g1').map((t) => t.id)).toEqual(['b', 'a']);
    expect(transfersFor(list, 'investment', 'i1').map((t) => t.id)).toEqual(['d']);
    expect(transfersFor(list, 'emergency', '').map((t) => t.id)).toEqual(['e']);
  });
  it('sums the amounts for a target', () => {
    expect(totalTransferred(list, 'savings', 'g1')).toBe(30_000);
    expect(totalTransferred(list, 'savings', 'g2')).toBe(5_000);
  });
});
