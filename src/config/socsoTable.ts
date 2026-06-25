/**
 * Official PERKESO SOCSO contribution table — Act 4, FIRST CATEGORY
 * (Employment Injury + Invalidity Scheme). Extracted verbatim from the PERKESO
 * PDF "New Contribution Rate" (verified 2026-06-24); see VERIFY.md.
 *
 * Each row: [uptoSen, employeeSen, employerSen] where the band is
 * (previousUpto, uptoSen] and amounts are in integer sen.
 *
 *  - employeeSen = the **Invalidity Scheme** employee share (the standard SOCSO
 *    deduction shown on payslips; max RM29.75 at the RM6,000 ceiling).
 *  - employerSen = First-Category employer share (info only).
 *
 * NOTE on SKBBK: the source PDF also lists a newer "non-employment injury (SKBBK)"
 * employee add-on. It is intentionally EXCLUDED here because the standard employee
 * SOCSO deduction (and every public calculator) uses the Invalidity column only.
 * See VERIFY.md if this ever needs revisiting.
 *
 * These values are statutory fixed amounts; they do NOT follow a single clean
 * formula (e.g. the RM70–100 band and several employer figures round irregularly),
 * which is why the exact table is encoded rather than computed.
 */

export const SOCSO_CEILING_SEN = 600_000; // RM6,000

export type SocsoRow = readonly [uptoSen: number, employeeSen: number, employerSen: number];

export const SOCSO_FIRST_CATEGORY: readonly SocsoRow[] = [
  [3_000, 10, 40], // up to RM30
  [5_000, 20, 70],
  [7_000, 30, 110],
  [10_000, 40, 150],
  [14_000, 60, 210],
  [20_000, 85, 295],
  [30_000, 125, 435],
  [40_000, 175, 615],
  [50_000, 225, 785],
  [60_000, 275, 965],
  [70_000, 325, 1_135],
  [80_000, 375, 1_315],
  [90_000, 425, 1_485],
  [100_000, 475, 1_665], // up to RM1,000
  [110_000, 525, 1_835],
  [120_000, 575, 2_015],
  [130_000, 625, 2_185],
  [140_000, 675, 2_365],
  [150_000, 725, 2_535],
  [160_000, 775, 2_715],
  [170_000, 825, 2_885],
  [180_000, 875, 3_065],
  [190_000, 925, 3_235],
  [200_000, 975, 3_415],
  [210_000, 1_025, 3_585],
  [220_000, 1_075, 3_765],
  [230_000, 1_125, 3_935],
  [240_000, 1_175, 4_115],
  [250_000, 1_225, 4_285],
  [260_000, 1_275, 4_465],
  [270_000, 1_325, 4_635],
  [280_000, 1_375, 4_815],
  [290_000, 1_425, 4_985],
  [300_000, 1_475, 5_165], // up to RM3,000
  [310_000, 1_525, 5_335],
  [320_000, 1_575, 5_515],
  [330_000, 1_625, 5_685],
  [340_000, 1_675, 5_865],
  [350_000, 1_725, 6_035],
  [360_000, 1_775, 6_215],
  [370_000, 1_825, 6_385],
  [380_000, 1_875, 6_565],
  [390_000, 1_925, 6_735],
  [400_000, 1_975, 6_915], // up to RM4,000
  [410_000, 2_025, 7_085],
  [420_000, 2_075, 7_265],
  [430_000, 2_125, 7_435],
  [440_000, 2_175, 7_615],
  [450_000, 2_225, 7_785],
  [460_000, 2_275, 7_965],
  [470_000, 2_325, 8_135],
  [480_000, 2_375, 8_315],
  [490_000, 2_425, 8_485],
  [500_000, 2_475, 8_665], // up to RM5,000
  [510_000, 2_525, 8_835],
  [520_000, 2_575, 9_015],
  [530_000, 2_625, 9_185],
  [540_000, 2_675, 9_365],
  [550_000, 2_725, 9_535],
  [560_000, 2_775, 9_715],
  [570_000, 2_825, 9_885],
  [580_000, 2_875, 10_065],
  [590_000, 2_925, 10_235],
  [600_000, 2_975, 10_415], // up to RM6,000 (ceiling) — max employee RM29.75
];

/** Index of the band a wage falls into; wages above the ceiling use the last band. */
export function socsoBandIndex(wageSen: number): number {
  for (let i = 0; i < SOCSO_FIRST_CATEGORY.length; i++) {
    if (wageSen <= SOCSO_FIRST_CATEGORY[i][0]) return i;
  }
  return SOCSO_FIRST_CATEGORY.length - 1;
}

/** Lower/upper bound (sen) of a band index. Used by EIS for the band midpoint. */
export function bandBoundsSen(index: number): { lowerSen: number; upperSen: number } {
  const upperSen = SOCSO_FIRST_CATEGORY[index][0];
  const lowerSen = index === 0 ? 0 : SOCSO_FIRST_CATEGORY[index - 1][0];
  return { lowerSen, upperSen };
}
