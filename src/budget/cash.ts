/**
 * "Where your cash rests" — potential interest on idle (non-investment) money in
 * banks, e-wallets and fixed deposits. Promo (limited-time) rates apply while
 * active; otherwise the base rate is used. Integer sen, rounded half-up.
 */
import { addSen, roundHalfUp, type Sen } from '../money/money';
import type { CashAccount, CashAccountType } from '../model/types';

export interface CashAccountStatus {
  id: string;
  name: string;
  type: CashAccountType;
  balanceSen: Sen;
  baseRatePercent: number;
  effectiveRatePercent: number;
  promoActive: boolean;
  annualEarningsSen: Sen;
  monthlyEarningsSen: Sen;
}

export function cashAccountStatus(acc: CashAccount, todayISO: string): CashAccountStatus {
  const hasPromo = acc.promoRatePercent != null && acc.promoRatePercent > 0;
  const promoActive = hasPromo && (!acc.promoEnds || acc.promoEnds >= todayISO);
  const effectiveRatePercent = promoActive ? acc.promoRatePercent! : acc.ratePercent;
  const annualEarningsSen = roundHalfUp((acc.balanceSen * effectiveRatePercent) / 100);
  return {
    id: acc.id,
    name: acc.name,
    type: acc.type,
    balanceSen: acc.balanceSen,
    baseRatePercent: acc.ratePercent,
    effectiveRatePercent,
    promoActive,
    annualEarningsSen,
    monthlyEarningsSen: roundHalfUp(annualEarningsSen / 12),
  };
}

export interface CashSummary {
  totalBalanceSen: Sen;
  totalAnnualEarningsSen: Sen;
  totalMonthlyEarningsSen: Sen;
  /** Blended effective rate across all accounts (%, p.a.). */
  blendedRatePercent: number;
  accounts: CashAccountStatus[];
}

export function cashSummary(accounts: CashAccount[], todayISO: string): CashSummary {
  const statuses = accounts.map((a) => cashAccountStatus(a, todayISO));
  const totalBalanceSen = addSen(...statuses.map((s) => s.balanceSen));
  const totalAnnualEarningsSen = addSen(...statuses.map((s) => s.annualEarningsSen));
  return {
    totalBalanceSen,
    totalAnnualEarningsSen,
    totalMonthlyEarningsSen: roundHalfUp(totalAnnualEarningsSen / 12),
    blendedRatePercent: totalBalanceSen > 0 ? (totalAnnualEarningsSen / totalBalanceSen) * 100 : 0,
    accounts: statuses,
  };
}
