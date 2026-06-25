import { describe, it, expect } from 'vitest';
import { epfEmployeeSen, epfEmployeeRatePercent, epfEmployerSen } from './epf';

describe('EPF employee (spec 7.1 oracle)', () => {
  it('gross RM5,000 -> employee EPF RM550.00 (11%)', () => {
    expect(epfEmployeeSen(500_000, 'under60', 'citizen')).toBe(55_000);
  });

  it('under-60 rate is 11% for citizen, PR and foreigner', () => {
    expect(epfEmployeeRatePercent('under60', 'citizen')).toBe(11);
    expect(epfEmployeeRatePercent('under60', 'pr')).toBe(11);
    expect(epfEmployeeRatePercent('under60', 'foreigner')).toBe(11);
  });

  it('age 60+ citizen contributes 0% (VERIFY.md D2)', () => {
    expect(epfEmployeeRatePercent('age60plus', 'citizen')).toBe(0);
    expect(epfEmployeeSen(500_000, 'age60plus', 'citizen')).toBe(0);
  });

  it('age 60+ PR / non-citizen contributes 5.5%', () => {
    expect(epfEmployeeRatePercent('age60plus', 'pr')).toBe(5.5);
    expect(epfEmployeeSen(500_000, 'age60plus', 'pr')).toBe(27_500); // RM275.00
  });

  it('zero gross -> zero EPF', () => {
    expect(epfEmployeeSen(0, 'under60', 'citizen')).toBe(0);
  });
});

describe('EPF Third Schedule banded algorithm', () => {
  it('bands in RM20 steps on the band upper limit, rounding UP to the next ringgit', () => {
    expect(epfEmployeeSen(500_000, 'under60', 'citizen')).toBe(55_000); // RM5,000 -> RM550
    expect(epfEmployeeSen(600_000, 'under60', 'citizen')).toBe(66_000); // RM6,000 -> RM660
    expect(epfEmployeeSen(1_000_000, 'under60', 'citizen')).toBe(110_000); // RM10,000 -> RM1,100
    // RM3,010 -> band upper RM3,020 -> 11% = RM332.20 -> rounded up to RM333
    expect(epfEmployeeSen(301_000, 'under60', 'citizen')).toBe(33_300);
  });

  it('uses the exact percentage above the RM20,000 ceiling', () => {
    expect(epfEmployeeSen(2_500_000, 'under60', 'citizen')).toBe(275_000); // RM25,000 -> RM2,750
  });
});

describe('EPF employer (info only)', () => {
  it('13% when wage <= RM5,000, 12% above', () => {
    expect(epfEmployerSen(500_000, 'under60', 'citizen')).toBe(65_000); // 13% of 5,000
    expect(epfEmployerSen(600_000, 'under60', 'citizen')).toBe(72_000); // 12% of 6,000
  });

  it('foreign worker under 60 -> RM5.00 flat', () => {
    expect(epfEmployerSen(600_000, 'under60', 'foreigner')).toBe(500);
  });
});
