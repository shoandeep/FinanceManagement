import { describe, it, expect } from 'vitest';
import { isUnsorted, unsortedExpenses, recentMerchants } from './capture';
import type { Expense } from '../model/types';

const e = (p: Partial<Expense>): Expense => ({
  id: Math.random().toString(36).slice(2),
  categoryId: 'cat',
  amountSen: 100,
  dateISO: '2026-06-01',
  ...p,
});

describe('isUnsorted', () => {
  it('treats empty / whitespace category as unsorted', () => {
    expect(isUnsorted(e({ categoryId: '' }))).toBe(true);
    expect(isUnsorted(e({ categoryId: '   ' }))).toBe(true);
    expect(isUnsorted(e({ categoryId: 'food' }))).toBe(false);
  });
});

describe('unsortedExpenses', () => {
  it('returns only unfiled captures, newest first', () => {
    const list = [
      e({ categoryId: 'food', dateISO: '2026-06-10' }),
      e({ categoryId: '', dateISO: '2026-06-05', note: 'old' }),
      e({ categoryId: '', dateISO: '2026-06-20', note: 'new' }),
    ];
    const out = unsortedExpenses(list);
    expect(out.map((x) => x.note)).toEqual(['new', 'old']);
  });
});

describe('recentMerchants', () => {
  it('dedupes case-insensitively, keeps recent order, respects limit', () => {
    const list = [
      e({ dateISO: '2026-06-01', note: 'Grab' }),
      e({ dateISO: '2026-06-09', note: 'grab' }), // dup of Grab, but newer
      e({ dateISO: '2026-06-08', note: 'Shopee' }),
      e({ dateISO: '2026-06-07', note: '   ' }), // blank ignored
      e({ dateISO: '2026-06-06', note: 'Petronas' }),
    ];
    expect(recentMerchants(list, 6)).toEqual(['grab', 'Shopee', 'Petronas']);
    expect(recentMerchants(list, 1)).toEqual(['grab']);
  });
});
