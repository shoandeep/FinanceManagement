import { useVault } from '../state/VaultContext';
import { unsortedExpenses } from '../budget/capture';
import { formatSen } from '../money/money';
import { Card, Button } from './components';

/**
 * "Sort later" inbox: quick captures with no category yet. Tap a category to
 * file one in a single tap (the ADHD-friendly capture-now / triage-later flow).
 * Renders nothing when the inbox is empty.
 */
export function Inbox() {
  const { data, update } = useVault();
  if (!data) return null;
  const items = unsortedExpenses(data.expenses);
  if (items.length === 0) return null;
  const cats = data.variableCategories;

  const file = (id: string, categoryId: string) =>
    update((d) => {
      const it = d.expenses.find((x) => x.id === id);
      if (it) it.categoryId = categoryId;
    });
  const remove = (id: string) =>
    update((d) => void (d.expenses = d.expenses.filter((x) => x.id !== id)));

  return (
    <Card title={`Inbox · to file (${items.length})`} className="break-inside-avoid border-gold/30 lg:mb-4">
      <p className="mb-3 text-xs text-ink-faint">Tap a category to file each capture.</p>
      <ul className="space-y-3">
        {items.map((e) => (
          <li key={e.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold tabular-nums text-ink">
                  {formatSen(e.amountSen)}
                  {e.sourceEventId && (
                    <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                      auto
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-ink-faint">
                  {e.note ? `${e.note} · ` : ''}
                  {e.dateISO}
                </p>
              </div>
              <Button
                variant="danger"
                className="px-2"
                aria-label="Discard capture"
                onClick={() => remove(e.id)}
              >
                ✕
              </Button>
            </div>
            {cats.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => file(e.id, c.id)}
                    className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-soft ring-1 ring-inset ring-line transition hover:bg-primary hover:text-primary-contrast"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
