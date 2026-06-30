import { useEffect, useState } from 'react';
import { useVault } from '../state/VaultContext';
import { todayISO } from '../budget/dates';
import { newId } from '../model/defaults';
import { applyTransferEffect } from '../budget/transfers';
import { PAYMENT_METHODS } from '../budget/payments';
import { formatSen, type Sen } from '../money/money';
import type { Transfer, TransferKind, PaymentMethod } from '../model/types';
import { Button } from './components';

// Remembered across captures in this session so repeat logging is one tap fewer.
let lastMethod: PaymentMethod | undefined;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];
const MAX_SEN = 99_999_999; // RM999,999.99 cap

type Mode = 'spend' | 'save' | 'invest';
const MODES: { id: Mode; label: string }[] = [
  { id: 'spend', label: 'Spend' },
  { id: 'save', label: 'Save' },
  { id: 'invest', label: 'Invest' },
];

/**
 * Frictionless capture: amount first (a POS-style cents pad), then one tap to
 * file it. "Spend" logs an expense (unsorted by default → Inbox). "Save" and
 * "Invest" log a manual transfer (e.g. paycheck → a bank/e-wallet or an
 * investment) that raises that account's balance — so money you move by hand is
 * reflected without shuffling pages. Works for guest (in-memory) and account.
 */
export function QuickCapture({
  onClose,
  initialCents = 0,
  initialNote = '',
}: {
  onClose: () => void;
  initialCents?: number;
  initialNote?: string;
}) {
  const { data, update } = useVault();
  const [mode, setMode] = useState<Mode>('spend');
  const [cents, setCents] = useState<Sen>(initialCents);
  const [categoryId, setCategoryId] = useState<string>(''); // '' = unsorted
  const [method, setMethod] = useState<PaymentMethod | undefined>(lastMethod); // how it was paid
  const [targetId, setTargetId] = useState<string>(''); // save/invest target account
  const [note, setNote] = useState(initialNote);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  if (!data) return null;
  const cats = data.variableCategories;
  const investments = data.investments.filter((i) => i.name.trim());
  const accounts = (data.cashAccounts ?? []).filter((a) => a.name.trim());

  // Targets for the active mode: cash accounts (Save) or investments (Invest).
  const targets = mode === 'save' ? accounts : mode === 'invest' ? investments : [];
  const targetValid = mode === 'spend' || targets.some((t) => t.id === targetId);

  function switchMode(m: Mode) {
    setMode(m);
    if (m === 'save') setTargetId(accounts[0]?.id ?? '');
    else if (m === 'invest') setTargetId(investments[0]?.id ?? '');
  }

  function press(k: string) {
    setCents((c) => {
      if (k === 'back') return Math.floor(c / 10);
      if (k === '00') return Math.min(c * 100, MAX_SEN);
      const d = Number(k);
      return Math.min(c * 10 + d, MAX_SEN);
    });
  }

  function commit(closeAfter: boolean) {
    if (cents <= 0 || !targetValid) return;
    update((d) => {
      if (mode === 'spend') {
        d.expenses.push({
          id: newId(),
          categoryId,
          amountSen: cents,
          dateISO: todayISO(),
          ...(method ? { method } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        });
        lastMethod = method; // remember for the next capture
        return;
      }
      const kind: TransferKind = mode === 'save' ? 'cash' : 'investment';
      const t: Transfer = {
        id: newId(),
        kind,
        targetId,
        amountSen: cents,
        dateISO: todayISO(),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      d.transfers.push(t);
      applyTransferEffect(d, t, 1);
    });
    if (closeAfter) {
      onClose();
    } else {
      setCents(0);
      setNote('');
      if (mode === 'spend') setCategoryId('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1100);
    }
  }
  const save = () => commit(true);

  const targetLabel = mode === 'invest' ? 'Into investment' : 'Into account';
  const flashText =
    mode === 'spend' ? '✓ Saved — add another' : mode === 'invest' ? '✓ Added to investment' : '✓ Added to account';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add"
    >
      <button aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="silk-panel kain-edge relative z-10 max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-3xl p-5 pb-7 shadow-2xl sm:rounded-3xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Quick add</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full px-2 text-ink-faint hover:text-ink">
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-lg py-1.5 text-sm font-semibold transition ${
                mode === m.id ? 'bg-primary text-primary-contrast' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Amount display */}
        <div className="my-3 text-center">
          <p
            aria-live="polite"
            className={`font-mono text-4xl font-bold tabular-nums tracking-tight transition ${
              cents > 0 ? 'text-ink' : 'text-ink-faint'
            }`}
          >
            {formatSen(cents)}
          </p>
          <p className="mt-1 h-4 text-xs text-positive">{savedFlash ? flashText : ''}</p>
        </div>

        {/* Spend: category chips */}
        {mode === 'spend' && cats.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Chip active={categoryId === ''} onClick={() => setCategoryId('')}>
              Unsorted
            </Chip>
            {cats.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        )}

        {/* Spend: how it was paid (tap again to clear) */}
        {mode === 'spend' && (
          <>
            <Label>Paid with</Label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((pm) => (
                <Chip
                  key={pm.id}
                  active={method === pm.id}
                  onClick={() => setMethod(method === pm.id ? undefined : pm.id)}
                >
                  {pm.emoji} {pm.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {/* Save / Invest: target + optional source account */}
        {mode !== 'spend' &&
          (targets.length === 0 ? (
            <p className="mb-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-soft">
              {mode === 'invest'
                ? 'Add an investment in Save → Investments first, then log transfers here.'
                : 'Add your bank / e-wallet accounts in Save → Advanced first, then log transfers here.'}
            </p>
          ) : (
            <>
              <Label>{targetLabel}</Label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {targets.map((t) => (
                  <Chip key={t.id} active={targetId === t.id} onClick={() => setTargetId(t.id)}>
                    {t.name}
                  </Chip>
                ))}
              </div>
            </>
          ))}

        {/* Vendor / note */}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'spend' ? 'Vendor (optional) — e.g. Grab, Tesco' : 'Note (optional)'}
          aria-label="Vendor or note"
          className="mb-2 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-gold focus:ring-2 focus:ring-ring/30"
        />

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              aria-label={k === 'back' ? 'Delete' : k}
              className="select-none rounded-xl bg-surface-2 py-3 text-xl font-semibold text-ink ring-1 ring-inset ring-line transition active:scale-95 active:bg-gold/15"
            >
              {k === 'back' ? '⌫' : k}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => commit(false)}
            disabled={cents <= 0 || !targetValid}
          >
            Save &amp; add another
          </Button>
          <Button variant="primary" className="flex-1" onClick={save} disabled={cents <= 0 || !targetValid}>
            Save
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          {mode === 'spend'
            ? 'No category? It waits in your Inbox to file later.'
            : 'Raises that account’s balance and saves an editable entry in Save.'}
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">{children}</p>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-primary text-primary-contrast'
          : 'bg-surface-2 text-ink-soft ring-1 ring-inset ring-line hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
