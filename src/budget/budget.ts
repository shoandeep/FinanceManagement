/**
 * Budget engine — pure functions over the persisted model. No advice is given;
 * every split is derived from the user's own editable percentages.
 */
import { addSen, clampMinZero, rateOfSen, roundHalfUp, type Sen } from '../money/money';
import type { Allocation, FixedCost, Goal, Investment } from '../model/types';
import { wholeMonthsBetween } from './dates';

/** Sum of all fixed monthly costs. */
export function totalFixedSen(fixedCosts: FixedCost[]): Sen {
  return addSen(...fixedCosts.map((c) => c.amountSen));
}

/** disposable = net - total fixed costs (never negative). */
export function disposableSen(netSen: Sen, fixedCosts: FixedCost[]): Sen {
  return clampMinZero(netSen - totalFixedSen(fixedCosts));
}

export interface AllocationResult {
  baseSen: Sen;
  savingsSen: Sen;
  investmentsSen: Sen;
  variableSen: Sen;
  /** base - (savings + investments + variable); 0 when percentages sum to 100. */
  unallocatedSen: Sen;
}

/**
 * Split the allocation base (net pay or disposable) into the three buckets using
 * the user's editable percentages. Percentages need not sum to 100; any leftover
 * is reported as `unallocatedSen`.
 */
export function computeAllocation(
  netSen: Sen,
  fixedCosts: FixedCost[],
  allocation: Allocation,
): AllocationResult {
  const baseSen =
    allocation.base === 'net' ? clampMinZero(netSen) : disposableSen(netSen, fixedCosts);
  const savingsSen = rateOfSen(baseSen, allocation.savingsPct);
  const investmentsSen = rateOfSen(baseSen, allocation.investmentsPct);
  const variableSen = rateOfSen(baseSen, allocation.variablePct);
  return {
    baseSen,
    savingsSen,
    investmentsSen,
    variableSen,
    unallocatedSen: baseSen - savingsSen - investmentsSen - variableSen,
  };
}

export interface EmergencyFundStatus {
  essentialMonthlySen: Sen;
  targetSen: Sen;
  currentSen: Sen;
  shortfallSen: Sen;
  pctToTarget: number; // 0-100
  monthsCovered: number;
  funded: boolean;
  /** Of this month's savings bucket, how much to route here first (until funded). */
  suggestedContributionSen: Sen;
}

/**
 * Emergency-fund status. Essential monthly expenses = fixed costs + the variable
 * spending budget. Savings are routed here first until the target is met.
 */
export function emergencyFundStatus(
  months: number,
  currentSen: Sen,
  totalFixed: Sen,
  variableBudgetSen: Sen,
  savingsBucketSen: Sen,
): EmergencyFundStatus {
  const essentialMonthlySen = totalFixed + variableBudgetSen;
  const targetSen = essentialMonthlySen * months;
  const shortfallSen = clampMinZero(targetSen - currentSen);
  const pctToTarget = targetSen > 0 ? Math.min(100, (currentSen / targetSen) * 100) : 100;
  const monthsCovered = essentialMonthlySen > 0 ? currentSen / essentialMonthlySen : 0;
  return {
    essentialMonthlySen,
    targetSen,
    currentSen,
    shortfallSen,
    pctToTarget,
    monthsCovered,
    funded: shortfallSen === 0,
    suggestedContributionSen: Math.min(clampMinZero(savingsBucketSen), shortfallSen),
  };
}

export interface GoalStatus {
  id: string;
  name: string;
  pctComplete: number; // 0-100
  remainingSen: Sen;
  monthsToDeadline: number | null;
  overdue: boolean;
  /** Monthly contribution needed to hit the deadline (null if no deadline). */
  suggestedMonthlySen: Sen | null;
}

export function goalStatus(goal: Goal, todayISO: string): GoalStatus {
  const remainingSen = clampMinZero(goal.targetSen - goal.currentSen);
  const pctComplete = goal.targetSen > 0 ? Math.min(100, (goal.currentSen / goal.targetSen) * 100) : 100;

  let monthsToDeadline: number | null = null;
  let overdue = false;
  let suggestedMonthlySen: Sen | null = null;

  if (goal.deadline) {
    const months = wholeMonthsBetween(todayISO, goal.deadline);
    monthsToDeadline = months;
    overdue = months < 0 || (months === 0 && goal.deadline < todayISO);
    if (remainingSen === 0) {
      suggestedMonthlySen = 0;
    } else if (months <= 0) {
      suggestedMonthlySen = remainingSen; // due now / overdue -> contribute it all
    } else {
      suggestedMonthlySen = roundHalfUp(remainingSen / months);
    }
  }

  return {
    id: goal.id,
    name: goal.name,
    pctComplete,
    remainingSen,
    monthsToDeadline,
    overdue,
    suggestedMonthlySen,
  };
}

/** Running total across investment pots (tracking only — not advice). */
export function investmentsTotalSen(investments: Investment[]): Sen {
  return addSen(...investments.map((i) => i.currentSen));
}
