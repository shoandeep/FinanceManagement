import { EPF } from '../config/statutory';
import { roundUpToRinggit, type Sen } from '../money/money';
import type { Age, Residency } from './types';

const RM20_SEN = 2_000;
const THIRD_SCHEDULE_CEILING_SEN = 2_000_000; // RM20,000

/**
 * EPF Third Schedule method. For wages up to RM20,000 the contribution is banded
 * in RM20 steps: the rate is applied to the band's UPPER limit and rounded UP to
 * the next ringgit. Above RM20,000 the exact percentage of the wage is used (still
 * rounded up to the next ringgit).
 *
 * Verified exact at RM5,000 -> RM550 (employee 11%) / RM650 (employer 13%). The
 * official KWSP Third Schedule PDF is access-blocked (HTTP 403), so the full table
 * could not be byte-validated; this implements the documented banded algorithm.
 * See VERIFY.md. Net pay remains an estimate and every line is overridable.
 */
function bandUpperSen(wageSen: Sen): Sen {
  return Math.ceil(wageSen / RM20_SEN) * RM20_SEN;
}

function epfContribSen(wageSen: Sen, ratePercent: number): Sen {
  if (ratePercent <= 0 || wageSen <= 0) return 0;
  const referenceSen = wageSen > THIRD_SCHEDULE_CEILING_SEN ? wageSen : bandUpperSen(wageSen);
  return roundUpToRinggit((referenceSen * ratePercent) / 100);
}

/**
 * EPF employee contribution rate (%).
 *  - Under 60: 11% for everyone.
 *  - 60+: 0% for Malaysian citizens; 5.5% for PR / non-citizens (VERIFY.md D2).
 */
export function epfEmployeeRatePercent(age: Age, residency: Residency): number {
  return EPF.employee[age][residency];
}

/** Employee EPF for the month, in sen (Third Schedule banded). */
export function epfEmployeeSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  return epfContribSen(grossSen, epfEmployeeRatePercent(age, residency));
}

/** Employer EPF for the month, in sen. INFORMATION ONLY (not in net pay). */
export function epfEmployerSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  if (grossSen <= 0) return 0;
  if (age === 'under60') {
    if (residency === 'foreigner') return EPF.employer.under60.foreignerFlatSen;
    const { wageAtOrBelowThresholdPct, wageAboveThresholdPct, thresholdSen } =
      EPF.employer.under60;
    const pct = grossSen <= thresholdSen ? wageAtOrBelowThresholdPct : wageAboveThresholdPct;
    return epfContribSen(grossSen, pct);
  }
  return epfContribSen(grossSen, EPF.employer.age60plus[residency]);
}
