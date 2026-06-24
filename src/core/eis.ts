import { EIS } from '../config/statutory';
import { roundToNearest5Sen, type Sen } from '../money/money';
import { bandMidpointSen } from './contributionBands';
import type { Age, Residency } from './types';

/** Whether EIS applies: excluded for age 60+ and for foreign workers. */
export function eisApplies(age: Age, residency: Residency): boolean {
  if (EIS.excludesAge60Plus && age === 'age60plus') return false;
  if (EIS.excludesForeignWorkers && residency === 'foreigner') return false;
  return true;
}

/**
 * EIS (Act 800) EMPLOYEE contribution for the month, in sen.
 * Banded on the band midpoint, capped at the RM6,000 ceiling -> max RM11.90.
 * Returns 0 when EIS does not apply (60+, foreign worker).
 */
export function eisEmployeeSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  if (!eisApplies(age, residency)) return 0;
  const mid = bandMidpointSen(grossSen, EIS.ceilingSen, EIS.bandWidthSen);
  return roundToNearest5Sen((mid * EIS.employeeRatePercent) / 100);
}

/** EIS EMPLOYER contribution for the month, in sen. INFO ONLY. */
export function eisEmployerSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  if (!eisApplies(age, residency)) return 0;
  const mid = bandMidpointSen(grossSen, EIS.ceilingSen, EIS.bandWidthSen);
  return roundToNearest5Sen((mid * EIS.employerRatePercent) / 100);
}
