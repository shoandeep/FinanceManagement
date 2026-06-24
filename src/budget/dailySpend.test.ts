import { describe, it, expect } from 'vitest';
import { computeDailyBudget } from './dailySpend';
import type { Expense, VariableCategory } from '../model/types';

const cats: VariableCategory[] = [
  { id: 'food', name: 'Food & drinks', sharePercent: 60 },
  { id: 'fun', name: 'Entertainment', sharePercent: 40 },
];

describe('dynamic daily budget (spec 7.3)', () => {
  it('dailyAllowance = (budget - spent) / days remaining (incl. today)', () => {
    // 2026-06-24: June has 30 days -> 7 days remaining incl. today
    const b = computeDailyBudget(300_000, cats, [], '2026-06-24');
    expect(b.daysRemaining).toBe(7);
    expect(b.spentMonthSen).toBe(0);
    expect(b.dailyAllowanceSen).toBe(42_857); // round(300000/7)
    expect(b.overspent).toBe(false);
    // per-category shares
    expect(b.categories[0].monthlyBudgetSen).toBe(180_000); // 60%
    expect(b.categories[1].monthlyBudgetSen).toBe(120_000); // 40%
  });

  it('recomputes after a logged expense', () => {
    const before = computeDailyBudget(300_000, cats, [], '2026-06-24');
    const expenses: Expense[] = [
      { id: 'e1', categoryId: 'food', amountSen: 50_000, dateISO: '2026-06-24' },
    ];
    const after = computeDailyBudget(300_000, cats, expenses, '2026-06-24');

    expect(after.spentMonthSen).toBe(50_000);
    expect(after.spentTodaySen).toBe(50_000);
    expect(after.dailyAllowanceSen).toBe(35_714); // round(250000/7)
    expect(after.dailyAllowanceSen).toBeLessThan(before.dailyAllowanceSen);
    expect(after.leftTodaySen).toBe(35_714 - 50_000); // today already over the allowance
  });

  it('handles the last day of the month (1 day remaining)', () => {
    const b = computeDailyBudget(300_000, cats, [], '2026-06-30');
    expect(b.daysRemaining).toBe(1);
    expect(b.dailyAllowanceSen).toBe(300_000); // whole remaining budget for the day
  });

  it('shows overspend as a negative allowance without crashing', () => {
    const expenses: Expense[] = [
      { id: 'e1', categoryId: 'food', amountSen: 400_000, dateISO: '2026-06-10' },
    ];
    const b = computeDailyBudget(300_000, cats, expenses, '2026-06-24');
    expect(b.remainingMonthSen).toBe(-100_000);
    expect(b.overspent).toBe(true);
    expect(b.dailyAllowanceSen).toBeLessThan(0);
    expect(Number.isFinite(b.dailyAllowanceSen)).toBe(true);
  });

  it('rolls over cleanly: last month’s expenses do not count this month', () => {
    const expenses: Expense[] = [
      { id: 'e1', categoryId: 'food', amountSen: 200_000, dateISO: '2026-05-20' },
    ];
    const b = computeDailyBudget(300_000, cats, expenses, '2026-06-01');
    expect(b.spentMonthSen).toBe(0); // May spend excluded in June
    expect(b.remainingMonthSen).toBe(300_000);
    expect(b.daysRemaining).toBe(30);
  });
});
