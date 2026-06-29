import { useEffect, useMemo, useState } from 'react';
import { useVault } from '../state/VaultContext';
import { buildTransactions, filterTransactions, totals, type TxnFilters } from '../budget/transactions';
import { formatSen, senFromRinggit } from '../money/money';
import { Button, Select } from './components';

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

/** Human label for a type-filter key. */
function typeOptionLabel(key: string, sampleLabel: string): string {
  if (key === 'bill') return 'Bills';
  if (key === 'transfer') return 'Transfers';
  if (key === 'uncat') return 'Uncategorised';
  return sampleLabel; // a category name
}

/**
 * Full transaction history — every recorded expense (out) and transfer (in),
 * filterable by direction, type, date range and amount. Read-only; edit/remove
 * lives on the Spend (expenses) and Save (transfers) screens.
 */
export function Transactions({ onClose }: { onClose: () => void }) {
  const { data } = useVault();
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const [typeKey, setTypeKey] = useState('all');
  const [fromISO, setFromISO] = useState('');
  const [toISO, setToISO] = useState('');
  const [minRM, setMinRM] = useState('');
  const [maxRM, setMaxRM] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const all = useMemo(() => (data ? buildTransactions(data) : []), [data]);
  const typeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of all) if (!seen.has(t.typeKey)) seen.set(t.typeKey, typeOptionLabel(t.typeKey, t.typeLabel));
    return [...seen.entries()]; // [key, label]
  }, [all]);

  if (!data) return null;

  const toSen = (rm: string): number | undefined => {
    if (!rm.trim()) return undefined;
    try {
      return senFromRinggit(rm);
    } catch {
      return undefined; // ignore partial/invalid input
    }
  };
  const filters: TxnFilters = {
    direction,
    typeKey,
    fromISO: fromISO || undefined,
    toISO: toISO || undefined,
    minSen: toSen(minRM),
    maxSen: toSen(maxRM),
  };
  const list = filterTransactions(all, filters);
  const t = totals(list);
  const anyFilter =
    direction !== 'all' || typeKey !== 'all' || fromISO || toISO || minRM || maxRM;
  const clear = () => {
    setDirection('all');
    setTypeKey('all');
    setFromISO('');
    setToISO('');
    setMinRM('');
    setMaxRM('');
  };

  const inputCls =
    'mt-1 w-full rounded-lg border border-line-strong bg-surface-2 px-2 py-2 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Transactions"
    >
      <button aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="silk-panel kain-edge relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Transactions</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full px-2 text-ink-faint hover:text-ink">
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line">
            {(['all', 'in', 'out'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                aria-pressed={direction === d}
                className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
                  direction === d ? 'bg-primary text-primary-contrast' : 'text-ink-faint hover:text-ink'
                }`}
              >
                {d === 'all' ? 'All' : d === 'in' ? 'Money in' : 'Money out'}
              </button>
            ))}
          </div>
          <label className="block text-[11px] text-ink-faint">
            Type
            <Select className="mt-1" aria-label="Type" value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
              <option value="all">All types</option>
              {typeOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-ink-faint">
              From
              <input type="date" value={fromISO} aria-label="From date" onChange={(e) => setFromISO(e.target.value)} className={inputCls} />
            </label>
            <label className="text-[11px] text-ink-faint">
              To
              <input type="date" value={toISO} aria-label="To date" onChange={(e) => setToISO(e.target.value)} className={inputCls} />
            </label>
            <label className="text-[11px] text-ink-faint">
              Min (RM)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={minRM}
                aria-label="Minimum amount"
                onChange={(e) => setMinRM(e.target.value)}
                className={`${inputCls} text-right tabular-nums`}
              />
            </label>
            <label className="text-[11px] text-ink-faint">
              Max (RM)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="—"
                value={maxRM}
                aria-label="Maximum amount"
                onChange={(e) => setMaxRM(e.target.value)}
                className={`${inputCls} text-right tabular-nums`}
              />
            </label>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-3 flex items-center justify-between gap-2 border-y border-line py-2 text-xs">
          <span className="text-ink-faint">
            {t.count} {t.count === 1 ? 'item' : 'items'}
          </span>
          <span className="flex items-center gap-3 tabular-nums">
            <span className="text-positive">+{formatSen(t.inSen)}</span>
            <span className="text-negative">−{formatSen(t.outSen)}</span>
          </span>
          {anyFilter && (
            <Button variant="ghost" className="px-2 py-0.5 text-xs" onClick={clear}>
              Clear
            </Button>
          )}
        </div>

        {/* List */}
        <ul className="-mx-1 mt-1 flex-1 divide-y divide-line overflow-y-auto px-1">
          {list.length === 0 ? (
            <li className="py-8 text-center text-sm text-ink-faint">No transactions match these filters.</li>
          ) : (
            list.map((tx) => {
              const inn = tx.direction === 'in';
              return (
                <li key={`${tx.source}-${tx.id}`} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{tx.title}</p>
                    <p className="truncate text-[11px] text-ink-faint">
                      {tx.typeLabel} · {longDate(tx.dateISO)}
                    </p>
                  </div>
                  <span className={`shrink-0 tabular-nums text-sm font-semibold ${inn ? 'text-positive' : 'text-negative'}`}>
                    {inn ? '+' : '−'}
                    {formatSen(tx.amountSen)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
