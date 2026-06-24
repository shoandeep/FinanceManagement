import { describe, it, expect } from 'vitest';
import { computeNetPay } from './netpay';

describe('computeNetPay — integration', () => {
  it('RM5,000 citizen under 60: EPF 550, SOCSO 24.75, EIS 9.90, PCB 110', () => {
    const b = computeNetPay({ grossSen: 500_000, age: 'under60', residency: 'citizen' });
    expect(b.epf.amountSen).toBe(55_000);
    // RM5,000 is below the RM6,000 ceiling: SOCSO band midpoint RM4,950 -> RM24.75,
    // EIS RM9.90 (the ceiling maxima RM29.75 / RM11.90 only apply from RM6,000).
    expect(b.socso.amountSen).toBe(2_475);
    expect(b.eis.amountSen).toBe(990);
    // chargeable = 60,000 - 4,000 - 9,000 = 47,000 (> 35,000 so no rebate)
    // annual tax = 150 + 450 + 720 = RM1,320 -> monthly PCB round(132,000/12) = RM110
    expect(b.pcb.amountSen).toBe(11_000);
    // net = 500,000 - 55,000 - 2,475 - 990 - 11,000
    expect(b.netSen).toBe(430_535);
    expect(b.isEstimate).toBe(true);
  });

  it('60+ citizen has no EPF and no EIS', () => {
    const b = computeNetPay({ grossSen: 500_000, age: 'age60plus', residency: 'citizen' });
    expect(b.epf.amountSen).toBe(0);
    expect(b.eis.amountSen).toBe(0);
    expect(b.socso.amountSen).toBe(2_475); // RM5,000 -> RM24.75
  });

  it('foreigner under 60 has no EIS', () => {
    const b = computeNetPay({ grossSen: 500_000, age: 'under60', residency: 'foreigner' });
    expect(b.eis.amountSen).toBe(0);
  });
});

describe('computeNetPay — override paths (payslip is source of truth, spec 7.2)', () => {
  it('a deduction override replaces the estimate and flows into net pay', () => {
    const b = computeNetPay(
      { grossSen: 500_000, age: 'under60', residency: 'citizen' },
      { epfEmployeeSen: 60_000 }, // payslip shows RM600 EPF
    );
    expect(b.epf.amountSen).toBe(60_000);
    expect(b.epf.estimateSen).toBe(55_000);
    expect(b.epf.overridden).toBe(true);
    // PCB recomputes from the overridden EPF; net reflects the new EPF
    expect(b.netSen).toBe(500_000 - b.epf.amountSen - b.socso.amountSen - b.eis.amountSen - b.pcb.amountSen);
  });

  it('a manual net-pay override drives the final figure directly', () => {
    const b = computeNetPay(
      { grossSen: 500_000, age: 'under60', residency: 'citizen' },
      { netSen: 430_000 }, // payslip net pay
    );
    expect(b.netOverridden).toBe(true);
    expect(b.netSen).toBe(430_000);
  });

  it('fully overriding every line marks it no longer an estimate', () => {
    const b = computeNetPay(
      { grossSen: 500_000, age: 'under60', residency: 'citizen' },
      {
        epfEmployeeSen: 55_000,
        socsoEmployeeSen: 2_975,
        eisEmployeeSen: 1_190,
        pcbMonthlySen: 16_000,
      },
    );
    expect(b.isEstimate).toBe(false);
  });
});
