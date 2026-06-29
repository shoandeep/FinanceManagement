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
import { computeSpendingPlan, type SpendingPlan } from '../budget/spendingPlan';
import { currentPayPeriod, type PayPeriod } from '../budget/payperiod';
import type { AppData, PayPeriodConfig } from '../model/types';
import type { Sen } from '../money/money';

const DEFAULT_PAY_PERIOD: PayPeriodConfig = { mode: 'calendarMonth', dayOfMonth: 25, customDates: {} };

export interface Finances {
  todayISO: string;
  pay: PayBreakdown;
  totalFixedSen: Sen;
  disposableSen: Sen;
  allocation: AllocationResult;
  emergency: EmergencyFundStatus;
  goals: GoalStatus[];
  investmentsTotalSen: Sen;
  spending: SpendingPlan;
  payPeriod: PayPeriod;
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
  const payPeriod = currentPayPeriod(data.payPeriod ?? DEFAULT_PAY_PERIOD, todayISO, data.profile?.state);
  const spending = computeSpendingPlan(
    allocation.variableSen,
    data.variableCategories,
    data.expenses,
    todayISO,
    { startISO: payPeriod.startISO, endISO: payPeriod.endISO },
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
    spending,
    payPeriod,
  };
}
