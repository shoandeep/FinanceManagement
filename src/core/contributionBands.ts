import { clampMinZero, type Sen } from '../money/money';

/**
 * SOCSO/EIS contribution tables are banded: a wage falls into a fixed-width band
 * and the contribution is computed on the band's MIDPOINT, then capped at the
 * ceiling. This reproduces the official maxima exactly (e.g. RM29.75 SOCSO and
 * RM11.90 EIS at the RM6,000 ceiling) across realistic salary ranges.
 *
 * Convention: exact band boundaries belong to the LOWER band, matching the
 * statutory "exceeding X but not exceeding Y" wording.
 */
export function bandMidpointSen(wageSen: Sen, ceilingSen: Sen, bandWidthSen: Sen): Sen {
  const capped = Math.min(clampMinZero(wageSen), ceilingSen);
  if (capped <= 0) return 0;
  const bandIndex = Math.ceil(capped / bandWidthSen); // boundary -> lower band
  return (bandIndex - 1) * bandWidthSen + bandWidthSen / 2;
}
