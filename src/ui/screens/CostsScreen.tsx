import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { newId } from '../../model/defaults';
import { formatSen } from '../../money/money';
import type { AllocationBase } from '../../model/types';
import { Card, Money, MoneyInput, TextInput, Button, Disclaimer } from '../components';

function AllocPctInput({
  label,
  value,
  amountSen,
  baseSen,
  onChange,
}: {
  label: string;
  value: number;
  amountSen: number;
  baseSen: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-faint">
          %
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              aria-label={`${label} percent`}
              className="w-full rounded-lg border border-line-strong bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
            />
            <span className="text-sm text-ink-faint">%</span>
          </div>
        </label>
        <label className="text-xs text-ink-faint">
          RM / month
          <div className="mt-1">
            <MoneyInput
              valueSen={amountSen}
              onChangeSen={(sen) => {
                if (baseSen === 0) return;
                onChange(Math.max(0, Math.min(100, Math.round((sen / baseSen) * 100))));
              }}
              aria-label={`${label} amount`}
              disabled={baseSen === 0}
            />
          </div>
        </label>
      </div>
    </div>
  );
}

export function CostsScreen() {
  const { data, update } = useVault();
  if (!data) return null;
  const f = deriveFinances(data, todayISO());
  const a = data.allocation;
  const pctSum = a.savingsPct + a.investmentsPct + a.variablePct;

  return (
    <div className="space-y-4">
      <Card
        title="Fixed monthly costs"
        action={
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() =>
              update((d) => d.fixedCosts.push({ id: newId(), name: '', amountSen: 0 }))
            }
          >
            + Add
          </Button>
        }
      >
        {data.fixedCosts.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No fixed costs yet — add rent, utilities, phone, internet, subscriptions, PTPTN, loans…
          </p>
        ) : (
          <ul className="space-y-3">
            {data.fixedCosts.map((c) => {
              const patch = (fn: (item: typeof c) => void) =>
                update((d) => {
                  const item = d.fixedCosts.find((x) => x.id === c.id);
                  if (item) fn(item);
                });
              return (
                <li key={c.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Cost name"
                      placeholder="e.g. Rent, Unifi, PTPTN"
                      value={c.name}
                      onChange={(e) => patch((item) => (item.name = e.target.value))}
                    />
                    <Button
                      variant="danger"
                      className="px-2"
                      aria-label={`Remove ${c.name || 'cost'}`}
                      onClick={() =>
                        update((d) => void (d.fixedCosts = d.fixedCosts.filter((x) => x.id !== c.id)))
                      }
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-faint">
                      Amount / month
                      <div className="mt-1">
                        <MoneyInput
                          valueSen={c.amountSen}
                          onChangeSen={(sen) => patch((item) => (item.amountSen = sen))}
                        />
                      </div>
                    </label>
                    <label className="text-xs text-ink-faint">
                      Due day (calendar)
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        value={c.dayOfMonth ?? ''}
                        placeholder="—"
                        aria-label="Due day of month"
                        onChange={(e) =>
                          patch((item) => {
                            const v = e.target.value;
                            if (v === '') delete item.dayOfMonth;
                            else item.dayOfMonth = Math.max(1, Math.min(31, Number(v) || 1));
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm tabular-nums text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="font-medium text-ink-soft">Total fixed</span>
          <span className="font-bold tabular-nums text-ink">
            <Money sen={f.totalFixedSen} />
          </span>
        </div>
      </Card>

      <Card title="Allocation">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-ink-soft">Split your</span>
          <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
            {(['disposable', 'net'] as AllocationBase[]).map((base) => (
              <button
                key={base}
                onClick={() => update((d) => void (d.allocation.base = base))}
                className={`rounded-md px-2.5 py-1 font-semibold capitalize transition ${
                  a.base === base
                    ? 'bg-primary text-primary-contrast'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                {base === 'disposable' ? 'After fixed' : 'Net pay'}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-xs text-ink-faint">
          Base: <Money sen={f.allocation.baseSen} /> / month
        </p>

        <div className="space-y-2">
          <AllocPctInput
            label="Savings"
            value={a.savingsPct}
            amountSen={f.allocation.savingsSen}
            baseSen={f.allocation.baseSen}
            onChange={(n) => update((d) => void (d.allocation.savingsPct = n))}
          />
          <AllocPctInput
            label="Investments"
            value={a.investmentsPct}
            amountSen={f.allocation.investmentsSen}
            baseSen={f.allocation.baseSen}
            onChange={(n) => update((d) => void (d.allocation.investmentsPct = n))}
          />
          <AllocPctInput
            label="Variable spending"
            value={a.variablePct}
            amountSen={f.allocation.variableSen}
            baseSen={f.allocation.baseSen}
            onChange={(n) => update((d) => void (d.allocation.variablePct = n))}
          />
        </div>

        <p
          className={`mt-3 text-xs ${pctSum === 100 ? 'text-ink-faint' : 'text-warning'}`}
        >
          {pctSum === 100
            ? 'Percentages total 100%.'
            : `Percentages total ${pctSum}% — ${formatSen(f.allocation.unallocatedSen)} unallocated.`}
        </p>
      </Card>

      <Disclaimer>
        This split is a neutral starting point you control — not financial advice. Adjust every number
        to fit your situation.
      </Disclaimer>
    </div>
  );
}
