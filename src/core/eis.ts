import { EIS } from '../config/statutory';
import { roundToNearest5Sen, type Sen } from '../money/money';
import { bandBoundsSen, socsoBandIndex } from '../config/socsoTable';
import type { Age, Residency } from './types';

/** Whether EIS applies: excluded for age 60+ and for foreign workers. */
export function eisApplies(age: Age, residency: Residency): boolean {
  if (EIS.excludesAge60Plus && age === 'age60plus') return false;
  if (EIS.excludesForeignWorkers && residency === 'foreigner') return false;
  return true;
}

/**
 * EIS (Act 800) EMPLOYEE contribution for the month, in sen.
 *
 * EIS uses the same PERKESO wage bands as SOCSO at 0.2% (employee = employer).
 * Computed as 0.2% of the band midpoint, rounded to 5 sen — exact at the RM6,000
 * ceiling (RM11.90) and for all realistic wages. Returns 0 when EIS doesn't apply.
 */
export function eisEmployeeSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  if (!eisApplies(age, residency) || grossSen <= 0) return 0;
  const { lowerSen, upperSen } = bandBoundsSen(socsoBandIndex(grossSen));
  const midpoint = (lowerSen + upperSen) / 2;
  return roundToNearest5Sen((midpoint * EIS.employeeRatePercent) / 100);
}

/** EIS EMPLOYER contribution for the month, in sen. INFO ONLY (mirrors employee). */
export function eisEmployerSen(grossSen: Sen, age: Age, residency: Residency): Sen {
  return eisEmployeeSen(grossSen, age, residency);
}
