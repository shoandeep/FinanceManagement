/**
 * CSV report export (opens directly in Excel / Google Sheets). No dependencies,
 * no network — the file is built in memory and saved via a blob download.
 *
 * Security: user-entered text (category/goal names, notes) is escaped AND guarded
 * against CSV formula injection (a leading = + - @ tab/CR is neutralised). Numeric
 * cells are emitted raw so Excel still treats them as numbers.
 */
import type { AppData } from '../model/types';
import type { Finances } from '../state/selectors';

const rm = (sen: number): string => (sen / 100).toFixed(2);

/** Escape a TEXT cell (quote if needed; neutralise formula-injection). */
function txt(value: unknown): string {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: string[][]): string {
  // Prepend a UTF-8 BOM so Excel reads accents/symbols correctly.
  return '﻿' + rows.map((r) => r.join(',')).join('\r\n');
}

function download(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Pure builders (returned strings) — kept separate so they can be unit-tested. */
export function incomeCsv(f: Finances): string {
  const p = f.pay;
  return toCsv([
    [txt('Item'), txt('Amount (RM)')],
    [txt('Gross monthly pay'), rm(p.grossSen)],
    [txt('EPF (employee)'), `-${rm(p.epf.amountSen)}`],
    [txt('SOCSO (employee)'), `-${rm(p.socso.amountSen)}`],
    [txt('EIS (employee)'), `-${rm(p.eis.amountSen)}`],
    [txt('PCB (income tax)'), `-${rm(p.pcb.amountSen)}`],
    [txt('Net pay'), rm(p.netSen)],
  ]);
}

export function expensesCsv(data: AppData): string {
  const catName = (id: string) =>
    data.variableCategories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const sorted = [...data.expenses].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
  return toCsv([
    [txt('Date'), txt('Category'), txt('Amount (RM)'), txt('Note')],
    ...sorted.map((e) => [txt(e.dateISO), txt(catName(e.categoryId)), rm(e.amountSen), txt(e.note ?? '')]),
  ]);
}

export function exportIncomeCsv(f: Finances): void {
  download(`finance-guru-income-${f.todayISO}.csv`, incomeCsv(f));
}

export function exportExpensesCsv(data: AppData, f: Finances): void {
  download(`finance-guru-expenses-${f.todayISO}.csv`, expensesCsv(data));
}

export function cashflowCsv(data: AppData, f: Finances): string {
  const blank: string[] = ['', ''];
  const rows: string[][] = [
    [txt('Item'), txt('Amount (RM)')],
    [txt('Net pay (monthly income)'), rm(f.pay.netSen)],
    blank,
    [txt('Fixed costs'), ''],
    ...data.fixedCosts.map((c) => [txt(`  ${c.name || 'Cost'}`), `-${rm(c.amountSen)}`]),
    [txt('Total fixed costs'), `-${rm(f.totalFixedSen)}`],
    [txt('Disposable (net − fixed)'), rm(f.disposableSen)],
    blank,
    [txt('Allocation'), ''],
    [txt('  Savings'), rm(f.allocation.savingsSen)],
    [txt('  Investments'), rm(f.allocation.investmentsSen)],
    [txt('  Variable spending budget'), rm(f.allocation.variableSen)],
    blank,
    [txt('Spent this month (variable)'), `-${rm(f.spending.spentMonthSen)}`],
    [txt('Remaining variable budget'), rm(f.spending.remainingMonthSen)],
    blank,
    [txt('Emergency fund'), ''],
    [txt('  Current balance'), rm(f.emergency.currentSen)],
    [txt('  Target'), rm(f.emergency.targetSen)],
    blank,
    [txt('Savings goals'), ''],
    ...data.goals.map((g) => [txt(`  ${g.name || 'Goal'} (target ${rm(g.targetSen)})`), rm(g.currentSen)]),
    blank,
    [txt('Investments total'), rm(f.investmentsTotalSen)],
  ];
  return toCsv(rows);
}

export function exportCashflowCsv(data: AppData, f: Finances): void {
  download(`finance-guru-cashflow-${f.todayISO}.csv`, cashflowCsv(data, f));
}
