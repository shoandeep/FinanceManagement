import { describe, it, expect } from 'vitest';
import { socsoEmployeeSen, socsoEmployerSen } from './socso';
import { SOCSO } from '../config/statutory';

describe('SOCSO employee (spec 7.1 oracle, corrected per VERIFY.md D1)', () => {
  it('caps at RM29.75 at and above the RM6,000 ceiling', () => {
    expect(socsoEmployeeSen(600_000)).toBe(2_975); // RM6,000
    expect(socsoEmployeeSen(1_000_000)).toBe(2_975); // RM10,000 — must not exceed ceiling
    expect(socsoEmployeeSen(50_000_000)).toBe(2_975); // absurdly high — still capped
  });

  it('matches the published invariant constant', () => {
    expect(socsoEmployeeSen(600_000)).toBe(SOCSO.invariants.employeeMaxSen);
  });

  it('zero / negative gross -> zero', () => {
    expect(socsoEmployeeSen(0)).toBe(0);
    expect(socsoEmployeeSen(-100)).toBe(0);
  });

  it('is non-decreasing in wage and never exceeds the cap', () => {
    let prev = 0;
    for (let wage = 0; wage <= 700_000; wage += 5_000) {
      const v = socsoEmployeeSen(wage);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(SOCSO.invariants.employeeMaxSen);
      prev = v;
    }
  });
});

describe('SOCSO employer (info only)', () => {
  it('caps at RM104.15 at the ceiling', () => {
    expect(socsoEmployerSen(600_000)).toBe(10_415);
    expect(socsoEmployerSen(1_000_000)).toBe(10_415);
    expect(socsoEmployerSen(600_000)).toBe(SOCSO.invariants.employerMaxSen);
  });
});
