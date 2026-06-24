import { EPF } from '../config/statutory';
import { rateOfSen, type Sen } from '../money/money';
import type { Age, Residency } from './types';

/**
 * EPF employee contribution rate (%).
 *  - Under 60: 11% for everyone.
 *  - 60+: 0% for Malaysian citizens; 5.5% for PR / non-citizens (VERIFY.md D2).
 */
export function epfEmployeeRatePercent(age: Age, residency: Residency): number {
  return EPF.employee[age][residency];
}

/**
 * Employee EPF for the month, in sen.
 *
 * Below RM20,000 the official Third Schedule is banded; we apply a labelled FLAT
 * percentage approximation (exact at boundaries such as RM5,000 -> RM550.00).
 * Overridable downstream with the actual payslip figure.
 */
export function epfEmployeeSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  const rate = epfEmployeeRatePercent(age, residency);
  if (rate === 0) return 0;
  return rateOfSen(grossSen, rate);
}

/** Employer EPF for the month, in sen. INFORMATION ONLY (not in net pay). */
export function epfEmployerSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  if (age === 'under60') {
    if (residency === 'foreigner') return EPF.employer.under60.foreignerFlatSen;
    const { wageAtOrBelowThresholdPct, wageAboveThresholdPct, thresholdSen } =
      EPF.employer.under60;
    const pct = grossSen <= thresholdSen ? wageAtOrBelowThresholdPct : wageAboveThresholdPct;
    return rateOfSen(grossSen, pct);
  }
  return rateOfSen(grossSen, EPF.employer.age60plus[residency]);
}
