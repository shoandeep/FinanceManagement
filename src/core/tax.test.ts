import { describe, it, expect } from 'vitest';
import {
  annualTaxFromChargeableSen,
  annualTaxAfterRebateSen,
  rebateSen,
  chargeableAnnualSen,
  monthlyPcbSen,
} from './tax';

describe('progressive tax engine (spec 7.1)', () => {
  it('chargeable RM71,000 -> annual tax RM3,890.00', () => {
    // 0 + 150 + 450 + 900 + 2,200 + 190
    expect(annualTaxFromChargeableSen(7_100_000)).toBe(389_000);
  });

  it('zero / negative chargeable -> zero tax', () => {
    expect(annualTaxFromChargeableSen(0)).toBe(0);
    expect(annualTaxFromChargeableSen(-100)).toBe(0);
  });

  it('very high chargeable hits the top bands', () => {
    // RM2,500,000: cumulative at 2,000,000 = RM528,400; + 500,000 @ 30% = 150,000
    expect(annualTaxFromChargeableSen(250_000_000)).toBe(67_840_000);
  });
});

describe('band-boundary cumulative tax (spec 7.1 boundaries — no off-by-one)', () => {
  it('exactly at each boundary uses the lower band cumulative', () => {
    expect(annualTaxFromChargeableSen(500_000)).toBe(0); // RM5,000
    expect(annualTaxFromChargeableSen(2_000_000)).toBe(15_000); // RM20,000 -> RM150
    expect(annualTaxFromChargeableSen(3_500_000)).toBe(60_000); // RM35,000 -> RM600
    expect(annualTaxFromChargeableSen(7_000_000)).toBe(370_000); // RM70,000 -> RM3,700
  });

  it('one sen above a boundary taxes the next ringgit at the higher rate', () => {
    // RM70,000 + RM1 -> RM3,700 + 19% of RM1 = RM3,700.19
    expect(annualTaxFromChargeableSen(7_000_100)).toBe(370_019);
  });
});

describe('RM400 rebate (spec 7.1)', () => {
  it('chargeable RM34,500 -> RM585 before, RM185.00 after rebate', () => {
    expect(annualTaxFromChargeableSen(3_450_000)).toBe(58_500);
    expect(annualTaxAfterRebateSen(3_450_000)).toBe(18_500);
  });

  it('rebate applies at <= RM35,000 and not above', () => {
    expect(rebateSen(3_500_000)).toBe(40_000); // exactly RM35,000 -> rebate
    expect(rebateSen(3_500_100)).toBe(0); // RM35,001 -> no rebate
  });

  it('rebate never makes tax negative', () => {
    // chargeable RM10,000 -> tax RM50, rebate RM400 -> floored at 0
    expect(annualTaxAfterRebateSen(1_000_000)).toBe(0);
  });
});

describe('chargeable income + monthly PCB (simplified estimate)', () => {
  it('subtracts EPF relief (capped RM4,000), personal RM9,000 and extra reliefs', () => {
    // gross RM8,000/mo -> annual RM96,000; EPF 11% = RM880/mo -> RM10,560/yr, capped 4,000
    // chargeable = 96,000 - 4,000 - 9,000 = RM83,000
    const chargeable = chargeableAnnualSen({
      grossMonthlySen: 800_000,
      annualEpfSen: 1_056_000,
    });
    expect(chargeable).toBe(8_300_000);
  });

  it('floors chargeable income at zero for low earners', () => {
    // gross RM700/mo -> annual RM8,400 < RM9,000 personal relief alone -> chargeable 0
    expect(
      chargeableAnnualSen({ grossMonthlySen: 70_000, annualEpfSen: 92_400 }),
    ).toBe(0);
    expect(monthlyPcbSen({ grossMonthlySen: 70_000, annualEpfSen: 92_400 })).toBe(0);
  });
});
