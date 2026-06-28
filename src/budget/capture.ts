/**
 * Quick-capture helpers. A "quick capture" is just an Expense with no category
 * yet (categoryId === '') — it still counts toward the month's spending (the
 * budget engine sums all expenses), it just sits in the Inbox until filed. Pure.
 */
import type { Expense } from '../model/types';

/** True if an expense hasn't been filed into a category yet. */
export function isUnsorted(e: Expense): boolean {
  return !e.categoryId || e.categoryId.trim() === '';
}

/** Unfiled captures, most recent first. */
export function unsortedExpenses(expenses: Expense[]): Expense[] {
  return expenses
    .filter(isUnsorted)
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
}

/**
 * Distinct recent merchant/note strings (most recent first), for one-tap chips.
 * De-duplicated case-insensitively; original casing of the most recent kept.
 */
export function recentMerchants(expenses: Expense[], limit = 6): string[] {
  const sorted = [...expenses].sort((a, b) =>
    a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0,
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of sorted) {
    const note = e.note?.trim();
    if (!note) continue;
    const key = note.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(note);
    if (out.length >= limit) break;
  }
  return out;
}
