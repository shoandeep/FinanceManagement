/**
 * Payment-method analytics: how much was spent via each method and how much is
 * still owed on the deferred methods (credit card + BNPL). Pure + integer sen.
 */
import type { Expense, PaymentMethod } from '../model/types';
import type { Sen } from '../money/money';

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; emoji: string }[] = [
  { id: 'cash', label: 'Cash', emoji: '💵' },
  { id: 'debit', label: 'Debit', emoji: '🏧' },
  { id: 'ewallet', label: 'E-wallet', emoji: '📱' },
  { id: 'credit', label: 'Credit', emoji: '💳' },
  { id: 'bnpl', label: 'BNPL', emoji: '⏳' },
];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.label]),
) as Record<PaymentMethod, string>;

export const PAYMENT_EMOJI: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.emoji]),
) as Record<PaymentMethod, string>;

/** Deferred methods you settle later — tracked as money owed. */
export const DEFERRED_METHODS: PaymentMethod[] = ['credit', 'bnpl'];

export interface MethodTotals {
  /** Sum spent per method. */
  byMethod: Record<PaymentMethod, Sen>;
  /** Sum of expenses with no method set. */
  untaggedSen: Sen;
  /** Grand total across the given expenses. */
  totalSen: Sen;
}

function emptyByMethod(): Record<PaymentMethod, Sen> {
  return { cash: 0, debit: 0, ewallet: 0, credit: 0, bnpl: 0 };
}

/** Totals per payment method across the given expenses. */
export function paymentTotals(expenses: Expense[]): MethodTotals {
  const byMethod = emptyByMethod();
  let untaggedSen = 0;
  let totalSen = 0;
  for (const e of expenses) {
    totalSen += e.amountSen;
    if (e.method) byMethod[e.method] += e.amountSen;
    else untaggedSen += e.amountSen;
  }
  return { byMethod, untaggedSen, totalSen };
}

export interface AmountsDue {
  creditSen: Sen;
  bnplSen: Sen;
  totalSen: Sen;
}

/**
 * Outstanding on the deferred methods — the running total charged to credit card
 * and BNPL across all the given expenses. (Settling these down is a follow-up.)
 */
export function amountsDue(expenses: Expense[]): AmountsDue {
  let creditSen = 0;
  let bnplSen = 0;
  for (const e of expenses) {
    if (e.method === 'credit') creditSen += e.amountSen;
    else if (e.method === 'bnpl') bnplSen += e.amountSen;
  }
  return { creditSen, bnplSen, totalSen: creditSen + bnplSen };
}
