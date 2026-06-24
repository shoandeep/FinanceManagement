import { addSen, clampMinZero, type Sen } from '../money/money';
import { epfEmployeeSen, epfEmployerSen } from './epf';
import { socsoEmployeeSen, socsoEmployerSen } from './socso';
import { eisEmployeeSen, eisEmployerSen } from './eis';
import { monthlyPcbSen } from './tax';
import type { Age, Residency } from './types';

export interface PayConfig {
  grossSen: Sen;
  age: Age;
  residency: Residency;
  /** Extra annual tax reliefs beyond the automatic personal + EPF reliefs. */
  extraReliefsSen?: Sen;
}

/**
 * Manual overrides from the actual payslip — the payslip is the source of truth.
 * Any provided value REPLACES the corresponding auto-estimate. A `netSen` override
 * replaces the final net pay outright.
 */
export interface PayOverrides {
  epfEmployeeSen?: Sen;
  socsoEmployeeSen?: Sen;
  eisEmployeeSen?: Sen;
  pcbMonthlySen?: Sen;
  netSen?: Sen;
}

export interface DeductionLine {
  /** Effective amount used in the calculation (auto or overridden). */
  amountSen: Sen;
  /** The auto-estimated amount, for reference even when overridden. */
  estimateSen: Sen;
  overridden: boolean;
}

export interface PayBreakdown {
  grossSen: Sen;
  epf: DeductionLine & { employerSen: Sen };
  socso: DeductionLine & { employerSen: Sen };
  eis: DeductionLine & { employerSen: Sen };
  pcb: DeductionLine;
  totalDeductionsSen: Sen;
  netSen: Sen;
  /** True if net pay itself was overridden (not derived from the lines). */
  netOverridden: boolean;
  /** True if any line is an estimate (EPF banded approx / simplified PCB). */
  isEstimate: boolean;
}

function line(estimateSen: Sen, overrideSen: Sen | undefined): DeductionLine {
  const overridden = overrideSen !== undefined;
  return { estimateSen, amountSen: overridden ? overrideSen : estimateSen, overridden };
}

/**
 * Compute the full net-pay breakdown from config + optional payslip overrides.
 * Pure and deterministic. PCB is recomputed from the EFFECTIVE (post-override)
 * EPF, unless PCB itself is overridden.
 */
export function computeNetPay(config: PayConfig, overrides: PayOverrides = {}): PayBreakdown {
  const { grossSen, age, residency, extraReliefsSen = 0 } = config;

  const epf = {
    ...line(epfEmployeeSen(grossSen, age, residency), overrides.epfEmployeeSen),
    employerSen: epfEmployerSen(grossSen, age, residency),
  };
  const socso = {
    ...line(socsoEmployeeSen(grossSen), overrides.socsoEmployeeSen),
    employerSen: socsoEmployerSen(grossSen),
  };
  const eis = {
    ...line(eisEmployeeSen(grossSen, age, residency), overrides.eisEmployeeSen),
    employerSen: eisEmployerSen(grossSen, age, residency),
  };

  const pcbEstimate = monthlyPcbSen({
    grossMonthlySen: grossSen,
    annualEpfSen: epf.amountSen * 12, // uses effective EPF (post-override)
    extraReliefsSen,
  });
  const pcb = line(pcbEstimate, overrides.pcbMonthlySen);

  const totalDeductionsSen = addSen(
    epf.amountSen,
    socso.amountSen,
    eis.amountSen,
    pcb.amountSen,
  );
  const derivedNet = clampMinZero(grossSen - totalDeductionsSen);

  const netOverridden = overrides.netSen !== undefined;
  const netSen = netOverridden ? overrides.netSen! : derivedNet;

  const isEstimate =
    !epf.overridden || !socso.overridden || !eis.overridden || !pcb.overridden;

  return {
    grossSen,
    epf,
    socso,
    eis,
    pcb,
    totalDeductionsSen,
    netSen,
    netOverridden,
    isEstimate,
  };
}
