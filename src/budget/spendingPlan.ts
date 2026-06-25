/**
 * Spending plan — multiple, financially-validated views of the variable budget.
 *
 * Two distinct numbers per period, on purpose:
 *  - **average**: an even split of the monthly budget (budget × periodDays ÷
 *    daysInMonth). STABLE — it does not balloon when you open the app late in the
 *    month, so it's the sensible headline ("you can spend ~RMx/day on average").
 *  - **onPace**: the original dynamic figure — spend this much to use the REMAINING
 *    budget evenly over the days left. Shown as a secondary "to stay on budget" hint.
 *
 * Also reports `left` (average − spent this period). All integer sen.
 */
import { addSen, roundHalfUp, type Sen } from '../money/money';
import type { Expense, VariableCategory } from '../model/types';
import {
  daysInMonth as daysInMonthOf,
  daysRemainingInMonth,
  dayOfMonth,
  firstOfMonthISO,
  monthKeyOf,
  parseISO,
  startOfWeekISO,
} from './dates';

export type SpendPeriod = 'day' | 'week' | 'month';

export interface PeriodSpend {
  averageSen: Sen; // even split of the monthly budget over this period
  spentSen: Sen; // spent in the current instance of this period
  leftSen: Sen; // average − spent (may be negative)
  onPaceSen: Sen; // dynamic: spend this much this period to stay on budget
}

export interface CategoryPlan {
  categoryId: string;
  name: string;
  monthlyBudgetSen: Sen;
  day: PeriodSpend;
  week: PeriodSpend;
  month: PeriodSpend;
}

export interface SpendingPlan {
  monthKey: string;
  daysInMonth: number;
  daysRemaining: number; // including today
  daysElapsed: number; // day-of-month
  monthlyBudgetSen: Sen;
  spentMonthSen: Sen;
  remainingMonthSen: Sen; // budget − spent (may be negative)
  overspent: boolean;
  day: PeriodSpend;
  week: PeriodSpend;
  month: PeriodSpend;
  categories: CategoryPlan[];
}

interface Ctx {
  daysInMonth: number;
  daysRemaining: number;
}

function periods(
  budgetSen: Sen,
  spentMonthSen: Sen,
  spentDaySen: Sen,
  spentWeekSen: Sen,
  ctx: Ctx,
): { day: PeriodSpend; week: PeriodSpend; month: PeriodSpend } {
  const remaining = budgetSen - spentMonthSen;
  const dr = Math.max(1, ctx.daysRemaining);

  const avgDay = roundHalfUp(budgetSen / ctx.daysInMonth);
  const avgWeek = roundHalfUp((budgetSen * 7) / ctx.daysInMonth);

  const onPaceDay = roundHalfUp(remaining / dr);
  const onPaceWeek = roundHalfUp((remaining * Math.min(7, dr)) / dr);

  return {
    day: { averageSen: avgDay, spentSen: spentDaySen, leftSen: avgDay - spentDaySen, onPaceSen: onPaceDay },
    week: {
      averageSen: avgWeek,
      spentSen: spentWeekSen,
      leftSen: avgWeek - spentWeekSen,
      onPaceSen: onPaceWeek,
    },
    month: {
      averageSen: budgetSen,
      spentSen: spentMonthSen,
      leftSen: budgetSen - spentMonthSen,
      onPaceSen: remaining,
    },
  };
}

const sum = (xs: Expense[]): Sen => addSen(...xs.map((e) => e.amountSen));

export function computeSpendingPlan(
  variableBudgetSen: Sen,
  categories: VariableCategory[],
  expenses: Expense[],
  todayISO: string,
): SpendingPlan {
  const { year, month } = parseISO(todayISO);
  const monthKey = monthKeyOf(todayISO);
  const ctx: Ctx = {
    daysInMonth: daysInMonthOf(year, month),
    daysRemaining: daysRemainingInMonth(todayISO),
  };

  // "This week" is clamped to the current month so it stays consistent with the
  // monthly budget it derives from.
  const monthStart = firstOfMonthISO(todayISO);
  const weekStartRaw = startOfWeekISO(todayISO);
  const weekStart = weekStartRaw > monthStart ? weekStartRaw : monthStart;

  const monthExpenses = expenses.filter((e) => monthKeyOf(e.dateISO) === monthKey);
  const inDay = (e: Expense) => e.dateISO === todayISO;
  const inWeek = (e: Expense) => e.dateISO >= weekStart && e.dateISO <= todayISO;

  const totals = periods(
    variableBudgetSen,
    sum(monthExpenses),
    sum(monthExpenses.filter(inDay)),
    sum(monthExpenses.filter(inWeek)),
    ctx,
  );

  const categoryPlans: CategoryPlan[] = categories.map((cat) => {
    const catMonth = monthExpenses.filter((e) => e.categoryId === cat.id);
    const monthlyBudgetSen = roundHalfUp((variableBudgetSen * cat.sharePercent) / 100);
    const p = periods(
      monthlyBudgetSen,
      sum(catMonth),
      sum(catMonth.filter(inDay)),
      sum(catMonth.filter(inWeek)),
      ctx,
    );
    return { categoryId: cat.id, name: cat.name, monthlyBudgetSen, ...p };
  });

  const spentMonthSen = totals.month.spentSen;
  return {
    monthKey,
    daysInMonth: ctx.daysInMonth,
    daysRemaining: ctx.daysRemaining,
    daysElapsed: dayOfMonth(todayISO),
    monthlyBudgetSen: variableBudgetSen,
    spentMonthSen,
    remainingMonthSen: variableBudgetSen - spentMonthSen,
    overspent: variableBudgetSen - spentMonthSen < 0,
    day: totals.day,
    week: totals.week,
    month: totals.month,
    categories: categoryPlans,
  };
}
