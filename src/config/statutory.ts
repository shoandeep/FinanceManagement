/**
 * Malaysian statutory constants — single source of truth.
 *
 * Every figure carries a `source`, `url`, `effectiveDate`, and the date it was
 * `verifiedOn`. See VERIFY.md for the full verification record. Defaults assume a
 * resident **Malaysian citizen, under 60**; age/residency are configurable.
 *
 * Two figures differ from the original build spec and were corrected to the
 * official values after verification (see VERIFY.md, decisions D1 & D2):
 *   - SOCSO Cat-1 employee max = RM29.75 (not RM29.90).
 *   - EPF age 60+ employee = 0% for citizens (5.5% only for PR / non-citizens).
 *
 * Amounts are in integer **sen**. Rates are percentages (11 = 11%).
 */

export interface StatutoryMeta {
  source: string;
  url: string;
  effectiveDate: string;
  verifiedOn: string;
  note?: string;
}

export const VERIFIED_ON = '2026-06-24';

/* ----------------------------------------------------------------------------
 * EPF (KWSP) — EPF Act 1991, Third Schedule
 * -------------------------------------------------------------------------- */
export const EPF = {
  /** Employee share %. Drives net pay. */
  employee: {
    under60: { citizen: 11, pr: 11, foreigner: 11 },
    // D2: citizen 60+ contributes 0%; 5.5% applies to PR / non-citizens 60+.
    age60plus: { citizen: 0, pr: 5.5, foreigner: 5.5 },
  },
  /** Employer share — INFORMATION ONLY, not part of the employee's net pay. */
  employer: {
    under60: {
      // citizen / PR
      wageAtOrBelowThresholdPct: 13,
      wageAboveThresholdPct: 12,
      thresholdSen: 500_000, // RM5,000
      // Foreign workers under 60: employer pays RM5.00 flat (info only).
      foreignerFlatSen: 500,
    },
    age60plus: { citizen: 4, pr: 5.5, foreigner: 5.5 },
  },
  /** Below this wage the official Third Schedule uses a BANDED table, not a flat %. */
  thirdScheduleCeilingSen: 2_000_000, // RM20,000
  /**
   * Implementation note: the official Third Schedule band table (RM20 bands) could
   * not be machine-extracted in this environment (no PDF text layer). The employee
   * EPF below RM20,000 is therefore computed as a labelled FLAT 11% approximation,
   * which is exact at band boundaries (e.g. RM5,000 -> RM550.00) and within ~RM1 of
   * the banded value elsewhere. Net pay is an estimate and is fully overridable.
   */
  employeeBandApproximation: 'flat-percentage' as const,
  meta: {
    source: 'KWSP — EPF Act 1991, Third Schedule',
    url: 'https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution',
    effectiveDate: '2025-10-01', // October 2025 wage
    verifiedOn: VERIFIED_ON,
    note: 'Employee 11% (<60). Employer 13% (wage <= RM5,000) / 12% (> RM5,000).',
  } satisfies StatutoryMeta,
} as const;

/* ----------------------------------------------------------------------------
 * SOCSO (PERKESO) — Act 4, Category 1 (employment injury + invalidity), under 60
 * -------------------------------------------------------------------------- */
export const SOCSO = {
  ceilingSen: 600_000, // RM6,000
  bandWidthSen: 10_000, // RM100 contribution bands (computed on band midpoint)
  category1: {
    employeeRatePercent: 0.5,
    employerRatePercent: 1.75, // info only
  },
  /** Reliable invariants at the ceiling (the test oracles). */
  invariants: {
    employeeMaxSen: 2_975, // RM29.75
    employerMaxSen: 10_415, // RM104.15 (info only)
  },
  meta: {
    source: 'PERKESO — Employees Social Security Act 1969 (Act 4), Third Schedule',
    url: 'https://www.perkeso.gov.my/en/rate-of-contribution.html',
    effectiveDate: '2024-10-01', // RM6,000 ceiling effective 1 Oct 2024
    verifiedOn: VERIFIED_ON,
    note: 'Banded table on band midpoint; employee max RM29.75 at the RM6,000 ceiling.',
  } satisfies StatutoryMeta,
} as const;

/* ----------------------------------------------------------------------------
 * EIS / SIP (PERKESO) — Act 800
 * -------------------------------------------------------------------------- */
export const EIS = {
  ceilingSen: 600_000, // RM6,000
  bandWidthSen: 10_000, // RM100 bands (band midpoint)
  employeeRatePercent: 0.2,
  employerRatePercent: 0.2, // info only
  /** Excluded: age 60+, and foreign workers. */
  excludesAge60Plus: true,
  excludesForeignWorkers: true,
  invariants: {
    employeeMaxSen: 1_190, // RM11.90
  },
  meta: {
    source: 'PERKESO — Employment Insurance System Act 2017 (Act 800), Second Schedule',
    url: 'https://www.perkeso.gov.my/en/rate-of-contribution.html',
    effectiveDate: '2024-10-01', // RM6,000 ceiling effective 1 Oct 2024
    verifiedOn: VERIFIED_ON,
    note: 'Banded table on band midpoint; employee max RM11.90 at the RM6,000 ceiling.',
  } satisfies StatutoryMeta,
} as const;

/* ----------------------------------------------------------------------------
 * Income tax / PCB (LHDN) — resident individual, YA 2025
 * -------------------------------------------------------------------------- */
export interface TaxBracket {
  /** Upper bound of the band, in sen (inclusive). Infinity for the top band. */
  upToSen: number;
  ratePercent: number;
}

export const TAX = {
  /** Progressive brackets — only income within each band is taxed at that rate. */
  brackets: [
    { upToSen: 500_000, ratePercent: 0 }, // 0 – 5,000
    { upToSen: 2_000_000, ratePercent: 1 }, // 5,001 – 20,000
    { upToSen: 3_500_000, ratePercent: 3 }, // 20,001 – 35,000
    { upToSen: 5_000_000, ratePercent: 6 }, // 35,001 – 50,000
    { upToSen: 7_000_000, ratePercent: 11 }, // 50,001 – 70,000
    { upToSen: 10_000_000, ratePercent: 19 }, // 70,001 – 100,000
    { upToSen: 40_000_000, ratePercent: 25 }, // 100,001 – 400,000
    { upToSen: 60_000_000, ratePercent: 26 }, // 400,001 – 600,000
    { upToSen: 200_000_000, ratePercent: 28 }, // 600,001 – 2,000,000
    { upToSen: Number.POSITIVE_INFINITY, ratePercent: 30 }, // > 2,000,000
  ] satisfies TaxBracket[],
  personalReliefSen: 900_000, // RM9,000 automatic
  epfReliefCapSen: 400_000, // RM4,000/yr cap on EPF relief
  rebate: {
    thresholdSen: 3_500_000, // chargeable <= RM35,000
    amountSen: 40_000, // RM400 rebate
  },
  meta: {
    source: 'LHDN — Tax Rate (resident individual), YA 2025',
    url: 'https://www.hasil.gov.my/en/individual/individual-life-cycle/income-declaration/tax-rate/',
    effectiveDate: '2025-01-01', // YA 2025
    verifiedOn: VERIFIED_ON,
    note: 'Simplified MTD estimate: chargeable = grossAnnual - min(EPF,4000) - 9000 - reliefs.',
  } satisfies StatutoryMeta,
} as const;
