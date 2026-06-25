import { describe, it, expect } from 'vitest';
import { incomeCsv, expensesCsv, cashflowCsv } from './csv';
import { createDefaultAppData } from '../model/defaults';
import { deriveFinances } from '../state/selectors';

function fixtures() {
  const data = createDefaultAppData();
  data.pay.grossSen = 800_000; // RM8,000
  // A deliberately malicious category name + note (CSV formula injection).
  data.variableCategories.push({ id: 'evil', name: '=SUM(A1:A9)', sharePercent: 0 });
  data.expenses.push({ id: 'x', categoryId: 'evil', amountSen: 1_234, dateISO: '2026-06-20', note: '+attack' });
  const f = deriveFinances(data, '2026-06-25');
  return { data, f };
}

describe('CSV export', () => {
  it('income report has correct figures', () => {
    const { f } = fixtures();
    const csv = incomeCsv(f);
    expect(csv).toContain('Gross monthly pay,8000.00');
    expect(csv).toContain('EPF (employee),-880.00');
    expect(csv).toContain('Net pay,6564.18');
    expect(csv.startsWith('﻿')).toBe(true); // UTF-8 BOM for Excel
  });

  it('neutralises CSV formula injection in user text', () => {
    const { data } = fixtures();
    const csv = expensesCsv(data);
    expect(csv).toContain("'=SUM(A1:A9)"); // leading apostrophe added
    expect(csv).toContain("'+attack");
    expect(csv).toContain('12.34'); // amount formatted
    expect(csv).not.toContain(',=SUM'); // never a raw formula cell
  });

  it('cashflow report includes net pay and allocation lines', () => {
    const { data, f } = fixtures();
    const csv = cashflowCsv(data, f);
    expect(csv).toContain('Net pay (monthly income),6564.18');
    expect(csv).toContain('Allocation');
    expect(csv).toContain('Investments total');
  });
});
