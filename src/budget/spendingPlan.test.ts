import { describe, it, expect } from 'vitest';
import { computeSpendingPlan } from './spendingPlan';
import type { Expense, VariableCategory } from '../model/types';

const cats: VariableCategory[] = [
  { id: 'food', name: 'Food & drinks', sharePercent: 60 },
  { id: 'fun', name: 'Entertainment', sharePercent: 40 },
];
const BUDGET = 300_000; // RM3,000 / month

describe('average is stable; dynamic on-pace is separate (the core fix)', () => {
  it('average daily/weekly/monthly split the monthly budget evenly', () => {
    const p = computeSpendingPlan(BUDGET, cats, [], '2026-06-25'); // June: 30 days
    expect(p.daysInMonth).toBe(30);
    expect(p.day.averageSen).toBe(10_000); // RM3,000 / 30 = RM100
    expect(p.week.averageSen).toBe(70_000); // RM3,000 × 7 / 30 = RM700
    expect(p.month.averageSen).toBe(300_000); // RM3,000
  });

  it('average does NOT balloon late in the month, but on-pace does', () => {
    // 25 June with nothing logged: 6 days left.
    const p = computeSpendingPlan(BUDGET, cats, [], '2026-06-25');
    expect(p.daysRemaining).toBe(6);
    expect(p.day.averageSen).toBe(10_000); // stable RM100
    expect(p.day.onPaceSen).toBe(50_000); // dynamic RM500 (3,000 / 6) — kept, but secondary
    expect(p.day.onPaceSen).toBeGreaterThan(p.day.averageSen);
  });
});

describe('left per period (average − spent)', () => {
  it('reflects what has already been spent', () => {
    const expenses: Expense[] = [
      { id: 'e1', categoryId: 'food', amountSen: 4_000, dateISO: '2026-06-25' }, // RM40 today
    ];
    const p = computeSpendingPlan(BUDGET, cats, expenses, '2026-06-25');
    expect(p.day.spentSen).toBe(4_000);
    expect(p.day.leftSen).toBe(6_000); // RM100 avg − RM40 spent = RM60 left today
    expect(p.month.leftSen).toBe(296_000); // RM3,000 − RM40
  });

  it('shows a negative "left" when the period is overspent', () => {
    const expenses: Expense[] = [
      { id: 'e1', categoryId: 'food', amountSen: 15_000, dateISO: '2026-06-25' }, // RM150 today
    ];
    const p = computeSpendingPlan(BUDGET, cats, expenses, '2026-06-25');
    expect(p.day.leftSen).toBe(-5_000); // RM100 − RM150 = −RM50
  });
});

describe('recompute, boundaries and rollover (spec 7.3, generalised)', () => {
  it('recomputes after a logged expense', () => {
    const before = computeSpendingPlan(BUDGET, cats, [], '2026-06-25');
    const after = computeSpendingPlan(
      BUDGET,
      cats,
      [{ id: 'e', categoryId: 'food', amountSen: 6_000, dateISO: '2026-06-25' }],
      '2026-06-25',
    );
    expect(after.day.onPaceSen).toBeLessThan(before.day.onPaceSen);
    expect(after.day.leftSen).toBe(before.day.leftSen - 6_000);
  });

  it('last day of month: average stays put, on-pace = whole remainder', () => {
    const p = computeSpendingPlan(BUDGET, cats, [], '2026-06-30');
    expect(p.daysRemaining).toBe(1);
    expect(p.day.averageSen).toBe(10_000); // still RM100
    expect(p.day.onPaceSen).toBe(300_000); // all remaining for the last day
  });

  it('overspent month: negative remaining, no crash', () => {
    const expenses: Expense[] = [
      { id: 'e', categoryId: 'food', amountSen: 400_000, dateISO: '2026-06-10' },
    ];
    const p = computeSpendingPlan(BUDGET, cats, expenses, '2026-06-25');
    expect(p.overspent).toBe(true);
    expect(p.remainingMonthSen).toBe(-100_000);
    expect(p.day.onPaceSen).toBeLessThan(0);
    expect(Number.isFinite(p.day.onPaceSen)).toBe(true);
  });

  it('rolls over: last month’s expenses do not count this month', () => {
    const expenses: Expense[] = [
      { id: 'e', categoryId: 'food', amountSen: 200_000, dateISO: '2026-05-20' },
    ];
    const p = computeSpendingPlan(BUDGET, cats, expenses, '2026-06-01');
    expect(p.spentMonthSen).toBe(0);
    expect(p.month.leftSen).toBe(300_000);
  });
});

describe('weekly window is clamped to the month', () => {
  it('counts this week only, excluding earlier-month spend', () => {
    const expenses: Expense[] = [
      { id: 'a', categoryId: 'food', amountSen: 3_000, dateISO: '2026-06-25' }, // today, in week
      { id: 'b', categoryId: 'food', amountSen: 9_000, dateISO: '2026-06-10' }, // same month, not this week
    ];
    const p = computeSpendingPlan(BUDGET, cats, expenses, '2026-06-25');
    expect(p.week.spentSen).toBe(3_000); // only today's
    expect(p.month.spentSen).toBe(12_000); // both
  });
});

describe('per-category plans', () => {
  it('splits the budget by share and tracks each category', () => {
    const expenses: Expense[] = [
      { id: 'e', categoryId: 'food', amountSen: 5_000, dateISO: '2026-06-25' },
    ];
    const p = computeSpendingPlan(BUDGET, cats, expenses, '2026-06-25');
    const food = p.categories.find((c) => c.categoryId === 'food')!;
    const fun = p.categories.find((c) => c.categoryId === 'fun')!;
    expect(food.monthlyBudgetSen).toBe(180_000); // 60% of RM3,000
    expect(fun.monthlyBudgetSen).toBe(120_000); // 40%
    expect(food.day.averageSen).toBe(6_000); // RM1,800 / 30 = RM60
    expect(food.day.spentSen).toBe(5_000);
    expect(food.day.leftSen).toBe(1_000); // RM60 − RM50
  });
});
