import { useEffect, useState } from 'react';
import { useVault } from '../state/VaultContext';
import { todayISO } from '../budget/dates';
import { newId } from '../model/defaults';
import { recentMerchants } from '../budget/capture';
import { formatSen, type Sen } from '../money/money';
import { Button } from './components';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];
const MAX_SEN = 99_999_999; // RM999,999.99 cap

/**
 * Frictionless expense capture: amount first (a POS-style cents pad), an optional
 * one-tap category, optional recent-merchant note, then Save. Defaults to an
 * UNSORTED capture (no category) so the fastest path is amount → Save → done; it
 * lands in the Inbox to file later. Works for guest (in-memory) and account.
 */
export function QuickCapture({ onClose }: { onClose: () => void }) {
  const { data, update } = useVault();
  const [cents, setCents] = useState<Sen>(0);
  const [categoryId, setCategoryId] = useState<string>(''); // '' = unsorted
  const [note, setNote] = useState('');
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
  const merchants = recentMerchants(data.expenses, 6);

  function press(k: string) {
    setCents((c) => {
      if (k === 'back') return Math.floor(c / 10);
      if (k === '00') return Math.min(c * 100, MAX_SEN);
      const d = Number(k);
      return Math.min(c * 10 + d, MAX_SEN);
    });
  }

  function commit(closeAfter: boolean) {
    if (cents <= 0) return;
    update((d) =>
      d.expenses.push({
        id: newId(),
        categoryId,
        amountSen: cents,
        dateISO: todayISO(),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    );
    if (closeAfter) {
      onClose();
    } else {
      setCents(0);
      setNote('');
      setCategoryId('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1100);
    }
  }
  const save = () => commit(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add expense"
    >
      <button aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="silk-panel kain-edge relative z-10 w-full max-w-sm rounded-t-3xl p-5 pb-7 shadow-2xl sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Quick add</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full px-2 text-ink-faint hover:text-ink">
            ✕
          </button>
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
          <p className="mt-1 h-4 text-xs text-positive">{savedFlash ? '✓ Saved — add another' : ''}</p>
        </div>

        {/* Optional category chips */}
        {cats.length > 0 && (
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

        {/* Note + recent merchants */}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note / merchant (optional)"
          aria-label="Note or merchant"
          className="mb-2 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-gold focus:ring-2 focus:ring-ring/30"
        />
        {merchants.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {merchants.map((m) => (
              <Chip key={m} active={note.trim().toLowerCase() === m.toLowerCase()} onClick={() => setNote(m)}>
                {m}
              </Chip>
            ))}
          </div>
        )}

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
          <Button variant="secondary" className="flex-1" onClick={() => commit(false)} disabled={cents <= 0}>
            Save &amp; add another
          </Button>
          <Button variant="primary" className="flex-1" onClick={save} disabled={cents <= 0}>
            Save
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          No category? It waits in your Inbox to file later.
        </p>
      </div>
    </div>
  );
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
