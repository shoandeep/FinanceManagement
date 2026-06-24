/**
 * deriveFinances — the single computation that turns persisted AppData into the
 * full view-model the UI renders. Pure: same data + date -> same result.
 */
import { computeNetPay, type PayBreakdown } from '../core/netpay';
import {
  computeAllocation,
  disposableSen,
  emergencyFundStatus,
  goalStatus,
  investmentsTotalSen,
  totalFixedSen,
  type AllocationResult,
  type EmergencyFundStatus,
  type GoalStatus,
} from '../budget/budget';
import { computeDailyBudget, type DailyBudget } from '../budget/dailySpend';
import type { AppData } from '../model/types';
import type { Sen } from '../money/money';

export interface Finances {
  todayISO: string;
  pay: PayBreakdown;
  totalFixedSen: Sen;
  disposableSen: Sen;
  allocation: AllocationResult;
  emergency: EmergencyFundStatus;
  goals: GoalStatus[];
  investmentsTotalSen: Sen;
  daily: DailyBudget;
}

export function deriveFinances(data: AppData, todayISO: string): Finances {
  const pay = computeNetPay(
    {
      grossSen: data.pay.grossSen,
      age: data.pay.age,
      residency: data.pay.residency,
      extraReliefsSen: data.pay.extraReliefsSen,
    },
    data.pay.overrides,
  );

  const totalFixed = totalFixedSen(data.fixedCosts);
  const allocation = computeAllocation(pay.netSen, data.fixedCosts, data.allocation);
  const emergency = emergencyFundStatus(
    data.emergencyFund.months,
    data.emergencyFund.currentSen,
    totalFixed,
    allocation.variableSen,
    allocation.savingsSen,
  );
  const daily = computeDailyBudget(
    allocation.variableSen,
    data.variableCategories,
    data.expenses,
    todayISO,
  );

  return {
    todayISO,
    pay,
    totalFixedSen: totalFixed,
    disposableSen: disposableSen(pay.netSen, data.fixedCosts),
    allocation,
    emergency,
    goals: data.goals.map((g) => goalStatus(g, todayISO)),
    investmentsTotalSen: investmentsTotalSen(data.investments),
    daily,
  };
}
