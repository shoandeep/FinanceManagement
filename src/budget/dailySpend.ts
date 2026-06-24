/**
 * Dynamic daily spending budget.
 *
 *   dailyAllowance = (monthlyVariableBudget - spentThisMonth) / daysRemaining
 *
 * Recomputed (by calling this pure function again) on every logged expense and on
 * date change. Overspend yields a negative allowance, surfaced as a catch-up.
 */
import { addSen, rateOfSen, roundHalfUp, type Sen } from '../money/money';
import type { Expense, VariableCategory } from '../model/types';
import { daysInMonth, daysRemainingInMonth, monthKeyOf, parseISO } from './dates';

export interface CategorySpend {
  categoryId: string;
  name: string;
  monthlyBudgetSen: Sen;
  spentMonthSen: Sen;
  spentTodaySen: Sen;
  remainingMonthSen: Sen; // may be negative
  dailyAllowanceSen: Sen; // may be negative
}

export interface DailyBudget {
  monthKey: string;
  daysInMonth: number;
  daysRemaining: number;
  variableBudgetSen: Sen;
  spentMonthSen: Sen;
  remainingMonthSen: Sen; // may be negative (overspent)
  dailyAllowanceSen: Sen; // total, may be negative
  spentTodaySen: Sen;
  leftTodaySen: Sen; // dailyAllowance - spentToday
  overspent: boolean;
  categories: CategorySpend[];
}

function sumExpenses(expenses: Expense[]): Sen {
  return addSen(...expenses.map((e) => e.amountSen));
}

/**
 * Compute the daily spending picture for `todayISO`. Only expenses in the same
 * calendar month as today count toward the month total (clean rollover: a new
 * month starts from zero).
 */
export function computeDailyBudget(
  variableBudgetSen: Sen,
  categories: VariableCategory[],
  expenses: Expense[],
  todayISO: string,
): DailyBudget {
  const { year, month } = parseISO(todayISO);
  const monthKey = monthKeyOf(todayISO);

  const monthExpenses = expenses.filter((e) => monthKeyOf(e.dateISO) === monthKey);
  const todayExpenses = monthExpenses.filter((e) => e.dateISO === todayISO);

  const daysRemaining = daysRemainingInMonth(todayISO);
  const spentMonthSen = sumExpenses(monthExpenses);
  const spentTodaySen = sumExpenses(todayExpenses);
  const remainingMonthSen = variableBudgetSen - spentMonthSen;
  const dailyAllowanceSen = roundHalfUp(remainingMonthSen / daysRemaining);

  const categoryStats: CategorySpend[] = categories.map((cat) => {
    const catMonth = monthExpenses.filter((e) => e.categoryId === cat.id);
    const catToday = todayExpenses.filter((e) => e.categoryId === cat.id);
    const monthlyBudgetSen = rateOfSen(variableBudgetSen, cat.sharePercent);
    const spentCatMonth = sumExpenses(catMonth);
    const remaining = monthlyBudgetSen - spentCatMonth;
    return {
      categoryId: cat.id,
      name: cat.name,
      monthlyBudgetSen,
      spentMonthSen: spentCatMonth,
      spentTodaySen: sumExpenses(catToday),
      remainingMonthSen: remaining,
      dailyAllowanceSen: roundHalfUp(remaining / daysRemaining),
    };
  });

  return {
    monthKey,
    daysInMonth: daysInMonth(year, month),
    daysRemaining,
    variableBudgetSen,
    spentMonthSen,
    remainingMonthSen,
    dailyAllowanceSen,
    spentTodaySen,
    leftTodaySen: dailyAllowanceSen - spentTodaySen,
    overspent: remainingMonthSen < 0,
    categories: categoryStats,
  };
}
