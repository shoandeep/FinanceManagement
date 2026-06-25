import { describe, it, expect } from 'vitest';
import { eisEmployeeSen, eisEmployerSen, eisApplies } from './eis';
import { EIS } from '../config/statutory';

describe('EIS employee (spec 7.1 oracle)', () => {
  it('caps at RM11.90 at and above the RM6,000 ceiling', () => {
    expect(eisEmployeeSen(600_000, 'under60', 'citizen')).toBe(1_190); // RM6,000
    expect(eisEmployeeSen(1_000_000, 'under60', 'citizen')).toBe(1_190); // RM10,000 — capped
    expect(eisEmployeeSen(600_000, 'under60', 'citizen')).toBe(EIS.invariants.employeeMaxSen);
  });

  it('is zero for age 60+ and for foreign workers (excluded)', () => {
    expect(eisApplies('age60plus', 'citizen')).toBe(false);
    expect(eisApplies('under60', 'foreigner')).toBe(false);
    expect(eisEmployeeSen(600_000, 'age60plus', 'citizen')).toBe(0);
    expect(eisEmployeeSen(600_000, 'under60', 'foreigner')).toBe(0);
  });

  it('matches band values below the ceiling', () => {
    expect(eisEmployeeSen(175_000, 'under60', 'citizen')).toBe(350); // RM1,750 -> RM3.50
    expect(eisEmployeeSen(500_000, 'under60', 'citizen')).toBe(990); // RM5,000 -> RM9.90
  });

  it('zero gross -> zero', () => {
    expect(eisEmployeeSen(0, 'under60', 'citizen')).toBe(0);
  });

  it('employer share mirrors employee and caps at RM11.90', () => {
    expect(eisEmployerSen(1_000_000, 'under60', 'citizen')).toBe(1_190);
  });
});
