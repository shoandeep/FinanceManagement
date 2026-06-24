import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { newId } from '../../model/defaults';
import { formatSen } from '../../money/money';
import { Card, Money, MoneyInput, TextInput, Button, ProgressBar, Stat, Disclaimer } from '../components';

export function SavingsScreen() {
  const { data, update } = useVault();
  if (!data) return null;
  const f = deriveFinances(data, todayISO());

  return (
    <div className="space-y-4">
      <Card title="Emergency fund">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">Months to cover</span>
            <input
              type="number"
              min={0}
              max={36}
              value={data.emergencyFund.months}
              onChange={(e) =>
                update((d) => void (d.emergencyFund.months = Math.max(0, Number(e.target.value) || 0)))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">Current balance</span>
            <div className="mt-1">
              <MoneyInput
                valueSen={data.emergencyFund.currentSen}
                onChangeSen={(sen) => update((d) => void (d.emergencyFund.currentSen = sen))}
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Stat
            label="Target"
            value={<Money sen={f.emergency.targetSen} />}
            sub={`${formatSen(f.emergency.essentialMonthlySen)} essential / month`}
          />
          <Stat
            label={f.emergency.funded ? 'Funded' : 'Shortfall'}
            value={<Money sen={f.emergency.shortfallSen} />}
            tone={f.emergency.funded ? 'positive' : 'negative'}
          />
        </div>
        <div className="mt-3">
          <ProgressBar
            value={f.emergency.pctToTarget}
            tone={f.emergency.funded ? 'emerald' : 'amber'}
            label="Emergency fund progress"
          />
        </div>
        {!f.emergency.funded && f.emergency.suggestedContributionSen > 0 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Suggested: route {formatSen(f.emergency.suggestedContributionSen)} of this month's savings
            here first.
          </p>
        )}
      </Card>

      <Card
        title="Savings goals"
        action={
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() =>
              update((d) => d.goals.push({ id: newId(), name: '', targetSen: 0, currentSen: 0 }))
            }
          >
            + Add
          </Button>
        }
      >
        {data.goals.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No goals yet.</p>
        ) : (
          <ul className="space-y-4">
            {data.goals.map((g, i) => {
              const s = f.goals[i];
              return (
                <li key={g.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Goal name"
                      placeholder="Goal name"
                      value={g.name}
                      onChange={(e) =>
                        update((d) => {
                          const item = d.goals.find((x) => x.id === g.id);
                          if (item) item.name = e.target.value;
                        })
                      }
                    />
                    <Button
                      variant="danger"
                      className="px-2"
                      aria-label={`Remove ${g.name || 'goal'}`}
                      onClick={() =>
                        update((d) => void (d.goals = d.goals.filter((x) => x.id !== g.id)))
                      }
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-500 dark:text-slate-400">
                      Saved
                      <div className="mt-1">
                        <MoneyInput
                          valueSen={g.currentSen}
                          onChangeSen={(sen) =>
                            update((d) => {
                              const item = d.goals.find((x) => x.id === g.id);
                              if (item) item.currentSen = sen;
                            })
                          }
                        />
                      </div>
                    </label>
                    <label className="text-xs text-slate-500 dark:text-slate-400">
                      Target
                      <div className="mt-1">
                        <MoneyInput
                          valueSen={g.targetSen}
                          onChangeSen={(sen) =>
                            update((d) => {
                              const item = d.goals.find((x) => x.id === g.id);
                              if (item) item.targetSen = sen;
                            })
                          }
                        />
                      </div>
                    </label>
                  </div>
                  <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                    Deadline (optional)
                    <input
                      type="date"
                      value={g.deadline ?? ''}
                      onChange={(e) =>
                        update((d) => {
                          const item = d.goals.find((x) => x.id === g.id);
                          if (!item) return;
                          if (e.target.value) item.deadline = e.target.value;
                          else delete item.deadline;
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <div className="mt-2">
                    <ProgressBar value={s.pctComplete} label={`${g.name} progress`} />
                    <p className="mt-1 flex justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>{s.pctComplete.toFixed(0)}% · {formatSen(s.remainingSen)} to go</span>
                      {s.suggestedMonthlySen !== null && (
                        <span className={s.overdue ? 'text-red-500' : ''}>
                          {s.overdue ? 'Overdue · ' : ''}
                          {formatSen(s.suggestedMonthlySen)}/mo
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card
        title="Investments"
        action={
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() => update((d) => d.investments.push({ id: newId(), name: '', currentSen: 0 }))}
          >
            + Add
          </Button>
        }
      >
        {data.investments.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Track pots like ASB, EPF i-Invest, unit trusts, equities. Tracking only — not advice.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.investments.map((inv) => (
              <li key={inv.id} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
                <TextInput
                  aria-label="Investment name"
                  placeholder="e.g. ASB"
                  value={inv.name}
                  onChange={(e) =>
                    update((d) => {
                      const item = d.investments.find((x) => x.id === inv.id);
                      if (item) item.name = e.target.value;
                    })
                  }
                />
                <MoneyInput
                  valueSen={inv.currentSen}
                  onChangeSen={(sen) =>
                    update((d) => {
                      const item = d.investments.find((x) => x.id === inv.id);
                      if (item) item.currentSen = sen;
                    })
                  }
                />
                <Button
                  variant="danger"
                  className="px-2"
                  aria-label={`Remove ${inv.name || 'investment'}`}
                  onClick={() =>
                    update((d) => void (d.investments = d.investments.filter((x) => x.id !== inv.id)))
                  }
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
          <span className="font-medium text-slate-600 dark:text-slate-300">Total invested</span>
          <span className="font-semibold tabular-nums">
            <Money sen={f.investmentsTotalSen} />
          </span>
        </div>
      </Card>

      <Disclaimer>Tracking only — not investment advice.</Disclaimer>
    </div>
  );
}
