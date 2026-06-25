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
  onChange,
}: {
  label: string;
  value: number;
  amountSen: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            aria-label={`${label} percent`}
            className="w-16 rounded-lg border border-line-strong bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-sm text-ink-faint">%</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        = <Money sen={amountSen} /> / month
      </p>
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
          <ul className="space-y-2">
            {data.fixedCosts.map((c) => (
              <li key={c.id} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
                <TextInput
                  aria-label="Cost name"
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) =>
                    update((d) => {
                      const item = d.fixedCosts.find((x) => x.id === c.id);
                      if (item) item.name = e.target.value;
                    })
                  }
                />
                <MoneyInput
                  valueSen={c.amountSen}
                  onChangeSen={(sen) =>
                    update((d) => {
                      const item = d.fixedCosts.find((x) => x.id === c.id);
                      if (item) item.amountSen = sen;
                    })
                  }
                />
                <Button
                  variant="danger"
                  className="px-2"
                  aria-label={`Remove ${c.name || 'cost'}`}
                  onClick={() =>
                    update((d) => {
                      d.fixedCosts = d.fixedCosts.filter((x) => x.id !== c.id);
                    })
                  }
                >
                  ✕
                </Button>
              </li>
            ))}
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
            onChange={(n) => update((d) => void (d.allocation.savingsPct = n))}
          />
          <AllocPctInput
            label="Investments"
            value={a.investmentsPct}
            amountSen={f.allocation.investmentsSen}
            onChange={(n) => update((d) => void (d.allocation.investmentsPct = n))}
          />
          <AllocPctInput
            label="Variable spending"
            value={a.variablePct}
            amountSen={f.allocation.variableSen}
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
