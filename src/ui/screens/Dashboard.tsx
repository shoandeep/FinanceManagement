import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { formatSen } from '../../money/money';
import { Card, Money, ProgressBar, Stat, Disclaimer } from '../components';

export function Dashboard({
  onGoToPay,
  onGoToSpend,
}: {
  onGoToPay: () => void;
  onGoToSpend: () => void;
}) {
  const { data } = useVault();
  if (!data) return null;
  const f = deriveFinances(data, todayISO());

  const leftTodayNegative = f.spending.day.leftSen < 0;

  return (
    <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0">
      {data.pay.grossSen === 0 && (
        <Card className="break-inside-avoid lg:mb-4">
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

      <Card className="break-inside-avoid lg:mb-4">
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

      <Card title="Emergency fund" className="break-inside-avoid lg:mb-4">
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

      <Card title="Today's spending" className="break-inside-avoid lg:mb-4" action={<a href="#" onClick={(e) => { e.preventDefault(); onGoToSpend(); }} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">Details →</a>}>
        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Can spend today (avg)"
            value={<Money sen={f.spending.day.averageSen} />}
            sub={`On pace: ${formatSen(f.spending.day.onPaceSen)}/day · ${f.spending.daysRemaining} days left`}
          />
          <Stat
            label="Left today"
            value={<Money sen={f.spending.day.leftSen} signed />}
            tone={leftTodayNegative ? 'negative' : 'positive'}
            sub={`Spent today ${formatSen(f.spending.day.spentSen)}`}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>Month to date</span>
          <span className={f.spending.overspent ? 'text-red-500' : ''}>
            {formatSen(f.spending.spentMonthSen)} / {formatSen(f.spending.monthlyBudgetSen)}
          </span>
        </div>
        {f.spending.categories.length > 0 && (
          <ul className="mt-4 space-y-3">
            {f.spending.categories.map((c) => {
              const pct =
                c.monthlyBudgetSen > 0 ? (c.month.spentSen / c.monthlyBudgetSen) * 100 : 0;
              const over = c.month.leftSen < 0;
              return (
                <li key={c.categoryId}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                    <span className={`tabular-nums ${over ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                      {formatSen(c.month.spentSen)} / {formatSen(c.monthlyBudgetSen)}
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

      <div className="break-inside-avoid">
        <Disclaimer>
          Estimates only — not financial or tax advice. Confirm against your payslip and LHDN / KWSP /
          PERKESO.
        </Disclaimer>
      </div>
    </div>
  );
}
