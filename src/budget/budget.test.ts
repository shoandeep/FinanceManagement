import { describe, it, expect } from 'vitest';
import {
  totalFixedSen,
  disposableSen,
  computeAllocation,
  emergencyFundStatus,
  goalStatus,
  investmentsTotalSen,
} from './budget';
import type { Allocation, FixedCost, Goal } from '../model/types';

const fixed: FixedCost[] = [
  { id: 'rent', name: 'Rent', amountSen: 150_000 },
  { id: 'net', name: 'Internet', amountSen: 12_900 },
];

describe('fixed costs + disposable', () => {
  it('totals fixed costs and computes disposable', () => {
    expect(totalFixedSen(fixed)).toBe(162_900);
    expect(disposableSen(500_000, fixed)).toBe(337_100);
  });
  it('disposable never goes negative', () => {
    expect(disposableSen(100_000, fixed)).toBe(0);
  });
});

describe('allocation engine', () => {
  const alloc: Allocation = {
    base: 'disposable',
    savingsPct: 30,
    investmentsPct: 20,
    variablePct: 50,
  };
  it('splits disposable by percentages, exact when they sum to 100', () => {
    const r = computeAllocation(500_000, [{ id: 'r', name: 'Rent', amountSen: 150_000 }], alloc);
    expect(r.baseSen).toBe(350_000);
    expect(r.savingsSen).toBe(105_000);
    expect(r.investmentsSen).toBe(70_000);
    expect(r.variableSen).toBe(175_000);
    expect(r.unallocatedSen).toBe(0);
  });
  it('can allocate from net pay instead of disposable', () => {
    const r = computeAllocation(500_000, fixed, { ...alloc, base: 'net' });
    expect(r.baseSen).toBe(500_000);
    expect(r.variableSen).toBe(250_000);
  });
});

describe('emergency fund', () => {
  it('targets N months of essential (fixed + variable) expenses', () => {
    const s = emergencyFundStatus(6, 0, 150_000, 175_000, 105_000);
    expect(s.essentialMonthlySen).toBe(325_000);
    expect(s.targetSen).toBe(1_950_000);
    expect(s.shortfallSen).toBe(1_950_000);
    expect(s.funded).toBe(false);
    expect(s.suggestedContributionSen).toBe(105_000); // routes the savings bucket here first
  });
  it('reports funded once the target is met', () => {
    const s = emergencyFundStatus(6, 2_000_000, 150_000, 175_000, 105_000);
    expect(s.funded).toBe(true);
    expect(s.shortfallSen).toBe(0);
    expect(s.pctToTarget).toBe(100);
    expect(s.suggestedContributionSen).toBe(0);
    expect(s.monthsCovered).toBeCloseTo(6.15, 1);
  });
});

describe('savings goals', () => {
  const today = '2026-06-24';
  it('suggests a monthly contribution to hit the deadline', () => {
    const g: Goal = {
      id: 'g',
      name: 'Japan',
      targetSen: 1_200_000,
      currentSen: 0,
      deadline: '2026-12-24',
    };
    const s = goalStatus(g, today);
    expect(s.monthsToDeadline).toBe(6);
    expect(s.suggestedMonthlySen).toBe(200_000); // RM2,000/mo
    expect(s.pctComplete).toBe(0);
    expect(s.overdue).toBe(false);
  });
  it('has no suggestion without a deadline', () => {
    const g: Goal = { id: 'g', name: 'Buffer', targetSen: 500_000, currentSen: 250_000 };
    const s = goalStatus(g, today);
    expect(s.suggestedMonthlySen).toBeNull();
    expect(s.monthsToDeadline).toBeNull();
    expect(s.pctComplete).toBe(50);
  });
  it('flags overdue goals and asks for the full remainder', () => {
    const g: Goal = {
      id: 'g',
      name: 'Late',
      targetSen: 500_000,
      currentSen: 100_000,
      deadline: '2026-01-01',
    };
    const s = goalStatus(g, today);
    expect(s.overdue).toBe(true);
    expect(s.suggestedMonthlySen).toBe(400_000);
  });
  it('a completed goal needs nothing', () => {
    const g: Goal = {
      id: 'g',
      name: 'Done',
      targetSen: 500_000,
      currentSen: 500_000,
      deadline: '2026-12-01',
    };
    const s = goalStatus(g, today);
    expect(s.pctComplete).toBe(100);
    expect(s.remainingSen).toBe(0);
    expect(s.suggestedMonthlySen).toBe(0);
  });
});

describe('investments', () => {
  it('sums pot balances (tracking only)', () => {
    expect(
      investmentsTotalSen([
        { id: 'asb', name: 'ASB', currentSen: 1_000_000 },
        { id: 'ut', name: 'Unit trust', currentSen: 250_000 },
      ]),
    ).toBe(1_250_000);
  });
});
