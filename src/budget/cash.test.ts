import { describe, it, expect } from 'vitest';
import { cashAccountStatus, cashSummary } from './cash';
import type { CashAccount } from '../model/types';

const today = '2026-06-26';

describe('cash account potential earnings', () => {
  it('uses the base rate when there is no promo', () => {
    const acc: CashAccount = { id: 'a', name: 'RYT Bank', type: 'bank', balanceSen: 1_000_000, ratePercent: 4 };
    const s = cashAccountStatus(acc, today);
    expect(s.effectiveRatePercent).toBe(4);
    expect(s.promoActive).toBe(false);
    expect(s.annualEarningsSen).toBe(40_000); // RM10,000 × 4% = RM400.00
    expect(s.monthlyEarningsSen).toBe(3_333); // round(400/12) = RM33.33
  });

  it('uses the promo rate while it is active', () => {
    const acc: CashAccount = {
      id: 's',
      name: 'ShopeePay',
      type: 'ewallet',
      balanceSen: 500_000,
      ratePercent: 3.65,
      promoRatePercent: 8,
      promoEnds: '2026-12-31',
    };
    const s = cashAccountStatus(acc, today);
    expect(s.promoActive).toBe(true);
    expect(s.effectiveRatePercent).toBe(8);
    expect(s.annualEarningsSen).toBe(40_000); // RM5,000 × 8% = RM400.00
  });

  it('falls back to the base rate once the promo has ended', () => {
    const acc: CashAccount = {
      id: 's',
      name: 'ShopeePay',
      type: 'ewallet',
      balanceSen: 500_000,
      ratePercent: 3.65,
      promoRatePercent: 8,
      promoEnds: '2026-06-25', // yesterday
    };
    const s = cashAccountStatus(acc, today);
    expect(s.promoActive).toBe(false);
    expect(s.effectiveRatePercent).toBe(3.65);
    expect(s.annualEarningsSen).toBe(18_250); // RM5,000 × 3.65% = RM182.50
  });

  it('promo with no end date stays active', () => {
    const acc: CashAccount = { id: 'x', name: 'TNG', type: 'ewallet', balanceSen: 200_000, ratePercent: 3, promoRatePercent: 5 };
    expect(cashAccountStatus(acc, today).effectiveRatePercent).toBe(5);
  });
});

describe('cash summary', () => {
  it('totals balances + earnings and blends the rate', () => {
    const accounts: CashAccount[] = [
      { id: 'a', name: 'RYT', type: 'bank', balanceSen: 1_000_000, ratePercent: 4 }, // RM400/yr
      { id: 'b', name: 'Shopee', type: 'ewallet', balanceSen: 500_000, ratePercent: 3.65, promoRatePercent: 8, promoEnds: '2026-12-31' }, // RM400/yr
    ];
    const sum = cashSummary(accounts, today);
    expect(sum.totalBalanceSen).toBe(1_500_000); // RM15,000
    expect(sum.totalAnnualEarningsSen).toBe(80_000); // RM800
    expect(sum.totalMonthlyEarningsSen).toBe(6_667); // round(800/12) = RM66.67
    expect(sum.blendedRatePercent).toBeCloseTo(5.333, 2); // 800/15000
  });

  it('handles an empty list', () => {
    const sum = cashSummary([], today);
    expect(sum.totalBalanceSen).toBe(0);
    expect(sum.blendedRatePercent).toBe(0);
  });
});
