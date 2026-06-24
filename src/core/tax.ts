import { TAX } from '../config/statutory';
import { clampMinZero, roundHalfUp, type Sen } from '../money/money';

/**
 * Annual income tax (before rebate) for a given chargeable income, in sen.
 * Progressive: only the income within each band is taxed at that band's rate.
 */
export function annualTaxFromChargeableSen(chargeableSen: Sen): Sen {
  const chargeable = clampMinZero(chargeableSen);
  if (chargeable === 0) return 0;

  let tax = 0;
  let lower = 0;
  for (const bracket of TAX.brackets) {
    if (chargeable > lower) {
      const upper = bracket.upToSen;
      const amountInBand = Math.min(chargeable, upper) - lower;
      tax += (amountInBand * bracket.ratePercent) / 100;
      lower = upper;
      if (chargeable <= upper) break;
    }
  }
  return roundHalfUp(tax);
}

/** The RM400 rebate if chargeable income <= RM35,000, else 0. */
export function rebateSen(chargeableSen: Sen): Sen {
  return clampMinZero(chargeableSen) <= TAX.rebate.thresholdSen ? TAX.rebate.amountSen : 0;
}

/** Annual tax after the rebate, floored at zero, in sen. */
export function annualTaxAfterRebateSen(chargeableSen: Sen): Sen {
  return clampMinZero(annualTaxFromChargeableSen(chargeableSen) - rebateSen(chargeableSen));
}

export interface ChargeableInput {
  grossMonthlySen: Sen;
  /** Annual employee EPF actually paid (used for EPF relief, capped at RM4,000). */
  annualEpfSen: Sen;
  /** Any additional annual reliefs the user enters (medical, lifestyle, etc.). */
  extraReliefsSen?: Sen;
}

/**
 * Annual chargeable income, in sen:
 *   grossAnnual - min(annualEPF, 4000) - personalRelief(9000) - extraReliefs.
 * This is a SIMPLIFIED estimate of LHDN's MTD; floored at zero.
 */
export function chargeableAnnualSen({
  grossMonthlySen,
  annualEpfSen,
  extraReliefsSen = 0,
}: ChargeableInput): Sen {
  const grossAnnual = grossMonthlySen * 12;
  const epfRelief = Math.min(annualEpfSen, TAX.epfReliefCapSen);
  return clampMinZero(grossAnnual - epfRelief - TAX.personalReliefSen - extraReliefsSen);
}

/** Estimated monthly PCB (MTD), in sen: annual tax after rebate / 12. */
export function monthlyPcbSen(input: ChargeableInput): Sen {
  const chargeable = chargeableAnnualSen(input);
  const annual = annualTaxAfterRebateSen(chargeable);
  return roundHalfUp(annual / 12);
}
