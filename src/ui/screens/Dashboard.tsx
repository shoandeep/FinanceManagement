import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { formatSen } from '../../money/money';
import { Card, Money, ProgressBar, Stat, Disclaimer } from '../components';

export function Dashboard({ onGoToPay }: { onGoToPay: () => void }) {
  const { data } = useVault();
  if (!data) return null;
  const f = deriveFinances(data, todayISO());

  const overspentToday = f.daily.leftTodaySen < 0;

  return (
    <div className="space-y-4">
      {data.pay.grossSen === 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Start by entering your gross monthly pay.
            </p>
            <button
              onClick={onGoToPay}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Add pay
            </button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-end justify-between">
          <Stat
            label="Estimated net pay / month"
            value={<Money sen={f.pay.netSen} />}
            sub={`Gross ${formatSen(f.pay.grossSen)}`}
          />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {f.pay.netOverridden ? 'From payslip' : 'Estimate'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Stat label="Fixed costs" value={<Money sen={f.totalFixedSen} />} tone="muted" />
          <Stat label="Left after fixed" value={<Money sen={f.disposableSen} />} tone="positive" />
        </div>
      </Card>

      <Card title="Emergency fund">
        <div className="flex items-center justify-between">
          <Stat
            label={`${f.emergency.monthsCovered.toFixed(1)} of ${data.emergencyFund.months} months covered`}
            value={<Money sen={f.emergency.currentSen} />}
            sub={`Target ${formatSen(f.emergency.targetSen)}`}
          />
          <Stat
            label="Shortfall"
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
      </Card>

      <Card title="Today's spending">
        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Allowance left today"
            value={<Money sen={f.daily.leftTodaySen} signed />}
            tone={overspentToday ? 'negative' : 'positive'}
            sub={`Daily budget ${formatSen(f.daily.dailyAllowanceSen)} · ${f.daily.daysRemaining} days left`}
          />
          <Stat
            label="Spent this month"
            value={<Money sen={f.daily.spentMonthSen} />}
            sub={`of ${formatSen(f.daily.variableBudgetSen)} budget`}
            tone={f.daily.overspent ? 'negative' : 'default'}
          />
        </div>
        {f.daily.categories.length > 0 && (
          <ul className="mt-4 space-y-3">
            {f.daily.categories.map((c) => {
              const pct =
                c.monthlyBudgetSen > 0 ? (c.spentMonthSen / c.monthlyBudgetSen) * 100 : 0;
              const over = c.remainingMonthSen < 0;
              return (
                <li key={c.categoryId}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                    <span className={`tabular-nums ${over ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                      {formatSen(c.spentMonthSen)} / {formatSen(c.monthlyBudgetSen)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={pct} tone={over ? 'amber' : 'indigo'} label={`${c.name} spent`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Disclaimer>
        Estimates only — not financial or tax advice. Confirm against your payslip and LHDN / KWSP /
        PERKESO.
      </Disclaimer>
    </div>
  );
}
