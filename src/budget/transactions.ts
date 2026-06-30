/**
 * Unified transaction history: the recorded money movements, merged from the
 * expense ledger (outgoing — incl. auto-logged bills/subscriptions) and the
 * transfers ledger (incoming — savings/investment/cash you moved by hand).
 * Pure + deterministic so it can be filtered and totalled in the UI and tested.
 */
import type { AppData, EventType } from '../model/types';
import { PAYMENT_LABEL } from './payments';

export type TxnDirection = 'in' | 'out';

export interface Txn {
  id: string;
  dateISO: string;
  amountSen: number;
  direction: TxnDirection;
  /** Primary line — note/merchant, or the account/category name. */
  title: string;
  /** Secondary line — category, or "Transfer · ASB", or "Bill". */
  typeLabel: string;
  /** Filter key: a category id, 'uncat', 'bill', or 'transfer'. */
  typeKey: string;
  source: 'expense' | 'transfer';
}

const EVENT_LABEL: Record<EventType, string> = {
  income: 'Income',
  subscription: 'Subscription',
  savings: 'Savings',
  investment: 'Investment',
  bnpl: 'BNPL',
  creditcard: 'Card payment',
  bill: 'Bill',
};

/** Build the full, newest-first transaction list from recorded expenses + transfers. */
export function buildTransactions(data: AppData): Txn[] {
  const catName = new Map(data.variableCategories.map((c) => [c.id, c.name]));
  const acctName = new Map((data.cashAccounts ?? []).map((a) => [a.id, a.name]));
  const invName = new Map(data.investments.map((i) => [i.id, i.name]));
  const eventType = new Map((data.recurringEvents ?? []).map((e) => [e.id, e.type]));
  const txns: Txn[] = [];

  for (const e of data.expenses) {
    const sourced = e.sourceEventId ? eventType.get(e.sourceEventId) : undefined;
    if (sourced) {
      txns.push({
        id: e.id,
        dateISO: e.dateISO,
        amountSen: e.amountSen,
        direction: 'out',
        title: e.note?.trim() || EVENT_LABEL[sourced],
        typeLabel: EVENT_LABEL[sourced],
        typeKey: 'bill',
        source: 'expense',
      });
    } else {
      const cat = e.categoryId ? (catName.get(e.categoryId) ?? 'Spending') : 'Uncategorised';
      txns.push({
        id: e.id,
        dateISO: e.dateISO,
        amountSen: e.amountSen,
        direction: 'out',
        title: e.note?.trim() || cat,
        typeLabel: e.method ? `${cat} · ${PAYMENT_LABEL[e.method]}` : cat,
        typeKey: e.categoryId || 'uncat',
        source: 'expense',
      });
    }
  }

  for (const t of data.transfers ?? []) {
    const name =
      t.kind === 'cash' ? (acctName.get(t.targetId) ?? 'Cash') : (invName.get(t.targetId) ?? 'Investment');
    txns.push({
      id: t.id,
      dateISO: t.dateISO,
      amountSen: t.amountSen,
      direction: 'in',
      title: t.note?.trim() || name,
      typeLabel: `${t.kind === 'cash' ? 'Transfer' : 'Investment'} · ${name}`,
      typeKey: 'transfer',
      source: 'transfer',
    });
  }

  return txns.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
}

export interface TxnFilters {
  fromISO?: string | undefined;
  toISO?: string | undefined;
  minSen?: number | undefined;
  maxSen?: number | undefined;
  direction?: 'all' | TxnDirection | undefined;
  typeKey?: string | undefined; // 'all' or a Txn.typeKey
}

/** Apply the active filters. Unset fields are ignored (no constraint). */
export function filterTransactions(txns: Txn[], f: TxnFilters): Txn[] {
  return txns.filter((t) => {
    if (f.fromISO && t.dateISO < f.fromISO) return false;
    if (f.toISO && t.dateISO > f.toISO) return false;
    if (f.minSen != null && t.amountSen < f.minSen) return false;
    if (f.maxSen != null && t.amountSen > f.maxSen) return false;
    if (f.direction && f.direction !== 'all' && t.direction !== f.direction) return false;
    if (f.typeKey && f.typeKey !== 'all' && t.typeKey !== f.typeKey) return false;
    return true;
  });
}

export interface TxnTotals {
  count: number;
  inSen: number;
  outSen: number;
  netSen: number;
}

/** In/out/net totals for a set of transactions. */
export function totals(txns: Txn[]): TxnTotals {
  let inSen = 0;
  let outSen = 0;
  for (const t of txns) {
    if (t.direction === 'in') inSen += t.amountSen;
    else outSen += t.amountSen;
  }
  return { count: txns.length, inSen, outSen, netSen: inSen - outSen };
}
