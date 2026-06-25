import type { Sen } from '../money/money';
import { SOCSO_FIRST_CATEGORY, socsoBandIndex } from '../config/socsoTable';

/**
 * SOCSO (Act 4, First Category) EMPLOYEE contribution for the month, in sen.
 * Exact official band-table lookup; capped at the RM6,000 ceiling (max RM29.75).
 */
export function socsoEmployeeSen(grossSen: Sen): Sen {
  if (grossSen <= 0) return 0;
  return SOCSO_FIRST_CATEGORY[socsoBandIndex(grossSen)][1];
}

/** SOCSO First-Category EMPLOYER contribution for the month, in sen. INFO ONLY. */
export function socsoEmployerSen(grossSen: Sen): Sen {
  if (grossSen <= 0) return 0;
  return SOCSO_FIRST_CATEGORY[socsoBandIndex(grossSen)][2];
}
