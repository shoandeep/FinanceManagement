import { describe, it, expect } from 'vitest';
import { paymentTotals, amountsDue, PAYMENT_METHODS } from './payments';
import type { Expense } from '../model/types';

const e = (p: Partial<Expense>): Expense => ({
  id: Math.random().toString(36).slice(2),
  categoryId: '',
  amountSen: 1000,
  dateISO: '2026-06-30',
  ...p,
});

const list: Expense[] = [
  e({ amountSen: 5000, method: 'credit' }),
  e({ amountSen: 3000, method: 'credit' }),
  e({ amountSen: 2000, method: 'bnpl' }),
  e({ amountSen: 1500, method: 'ewallet' }),
  e({ amountSen: 1000, method: 'debit' }),
  e({ amountSen: 800 }), // untagged
];

describe('paymentTotals', () => {
  const t = paymentTotals(list);
  it('sums per method', () => {
    expect(t.byMethod.credit).toBe(8000);
    expect(t.byMethod.bnpl).toBe(2000);
    expect(t.byMethod.ewallet).toBe(1500);
    expect(t.byMethod.debit).toBe(1000);
    expect(t.byMethod.cash).toBe(0);
  });
  it('tracks untagged + grand total', () => {
    expect(t.untaggedSen).toBe(800);
    expect(t.totalSen).toBe(13300);
  });
});

describe('amountsDue', () => {
  it('sums credit + BNPL as owed', () => {
    const d = amountsDue(list);
    expect(d.creditSen).toBe(8000);
    expect(d.bnplSen).toBe(2000);
    expect(d.totalSen).toBe(10000);
  });
  it('is zero with no deferred spend', () => {
    expect(amountsDue([e({ method: 'cash' })]).totalSen).toBe(0);
  });
});

describe('PAYMENT_METHODS', () => {
  it('covers the five methods', () => {
    expect(PAYMENT_METHODS.map((m) => m.id)).toEqual(['cash', 'debit', 'ewallet', 'credit', 'bnpl']);
  });
});
