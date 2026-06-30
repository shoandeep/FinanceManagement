import { useState } from 'react';
import { useVault } from '../state/VaultContext';
import { transfersFor, applyTransferEffect } from '../budget/transfers';
import { formatSen } from '../money/money';
import type { TransferKind } from '../model/types';
import { MoneyInput, TextInput, Button } from './components';

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Compact, collapsible history of logged transfers for a tracker. Each row shows
 * date + amount; expand to edit the amount/date/note or delete. Edits delta-
 * adjust the target balance; delete reverses the entry. For 'debt' the entries
 * are repayments (they lower what you owe) and are labelled accordingly.
 */
export function TransferLog({ kind, targetId }: { kind: TransferKind; targetId: string }) {
  const { data, update } = useVault();
  const [openId, setOpenId] = useState<string | null>(null);
  if (!data) return null;
  const items = transfersFor(data.transfers, kind, targetId);
  if (items.length === 0) return null;
  const isDebt = kind === 'debt';
  const word = isDebt ? 'repayment' : 'transfer';

  const patch = (id: string, fn: (t: (typeof items)[number]) => void) =>
    update((d) => {
      const t = d.transfers.find((x) => x.id === id);
      if (t) fn(t);
    });
  const setAmount = (id: string, sen: number) =>
    update((d) => {
      const t = d.transfers.find((x) => x.id === id);
      if (!t) return;
      applyTransferEffect(d, t, -1);
      t.amountSen = sen;
      applyTransferEffect(d, t, 1);
    });
  const remove = (id: string) =>
    update((d) => {
      const t = d.transfers.find((x) => x.id === id);
      if (!t) return;
      applyTransferEffect(d, t, -1);
      d.transfers = d.transfers.filter((x) => x.id !== id);
    });

  return (
    <div className="mt-3 border-t border-line pt-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {isDebt ? 'Repayments' : 'Transfers'} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((t) => {
          const open = openId === t.id;
          return (
            <li key={t.id} className="rounded-lg bg-surface-2/50">
              <button
                onClick={() => setOpenId(open ? null : t.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
              >
                <span className="text-ink-faint">{shortDate(t.dateISO)}</span>
                {t.note && <span className="truncate text-ink-faint">· {t.note}</span>}
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-positive">
                  {isDebt ? '−' : '+'}
                  {formatSen(t.amountSen)}
                </span>
                <span aria-hidden className="shrink-0 text-ink-faint">
                  {open ? '▾' : '▸'}
                </span>
              </button>
              {open && (
                <div className="space-y-2 px-2 pb-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-ink-faint">
                      Amount
                      <div className="mt-1">
                        <MoneyInput valueSen={t.amountSen} onChangeSen={(sen) => setAmount(t.id, sen)} />
                      </div>
                    </label>
                    <label className="text-[11px] text-ink-faint">
                      Date
                      <input
                        type="date"
                        value={t.dateISO}
                        aria-label={`${word} date`}
                        onChange={(e) => e.target.value && patch(t.id, (x) => void (x.dateISO = e.target.value))}
                        className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                      />
                    </label>
                  </div>
                  <label className="block text-[11px] text-ink-faint">
                    Note
                    <TextInput
                      className="mt-1"
                      placeholder="Optional"
                      value={t.note ?? ''}
                      onChange={(e) =>
                        patch(t.id, (x) => {
                          if (e.target.value) x.note = e.target.value;
                          else delete x.note;
                        })
                      }
                    />
                  </label>
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    aria-label={`Delete ${word}`}
                    onClick={() => remove(t.id)}
                  >
                    Delete entry
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
