import { SOCSO } from '../config/statutory';
import { roundToNearest5Sen, type Sen } from '../money/money';
import { bandMidpointSen } from './contributionBands';

/**
 * SOCSO (Act 4, Category 1) EMPLOYEE contribution for the month, in sen.
 * Banded on the band midpoint, capped at the RM6,000 ceiling -> max RM29.75.
 */
export function socsoEmployeeSen(grossSen: Sen): Sen {
  const mid = bandMidpointSen(grossSen, SOCSO.ceilingSen, SOCSO.bandWidthSen);
  return roundToNearest5Sen((mid * SOCSO.category1.employeeRatePercent) / 100);
}

/** SOCSO Category 1 EMPLOYER contribution for the month, in sen. INFO ONLY. */
export function socsoEmployerSen(grossSen: Sen): Sen {
  const mid = bandMidpointSen(grossSen, SOCSO.ceilingSen, SOCSO.bandWidthSen);
  return roundToNearest5Sen((mid * SOCSO.category1.employerRatePercent) / 100);
}
