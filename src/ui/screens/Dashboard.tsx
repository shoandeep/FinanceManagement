import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { formatSen } from '../../money/money';
import { Card, Money, ProgressBar, Stat, Disclaimer } from '../components';
import { Inbox } from '../Inbox';

export function Dashboard({
  onGoToPay,
  onGoToSpend,
  onOpenSettings,
}: {
  onGoToPay: () => void;
  onGoToSpend: () => void;
  onOpenSettings: () => void;
}) {
  const { data } = useVault();
  if (!data) return null;
  const f = deriveFinances(data, todayISO());

  const leftTodayNegative = f.spending.day.leftSen < 0;
  const isCycle = (data.payPeriod?.mode ?? 'calendarMonth') !== 'calendarMonth';

  return (
    <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0">
      <Inbox />

      {data.pay.grossSen === 0 && (
        <Card className="break-inside-avoid lg:mb-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              Start by entering your gross monthly pay.
            </p>
            <button
              onClick={onGoToPay}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-contrast transition hover:brightness-110"
            >
              Add pay
            </button>
          </div>
        </Card>
      )}

      <section className="silk-panel kain-edge break-inside-avoid rounded-2xl bg-primary p-4 lg:mb-4">
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-primary-contrast/60">
              Estimated net pay / month
            </p>
            <p className="mt-1 text-base font-bold leading-tight tracking-tight tabular-nums text-primary-contrast sm:text-lg">
              {formatSen(f.pay.netSen)}
            </p>
            <p className="mt-0.5 text-xs text-primary-contrast/60">
              Gross {formatSen(f.pay.grossSen)}
            </p>
          </div>
          <span className="rounded-full border border-primary-contrast/25 bg-primary-contrast/10 px-2 py-0.5 text-[11px] font-semibold text-primary-contrast">
            {f.pay.netOverridden ? 'From payslip' : 'Estimate'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-primary-contrast/60">
              Fixed costs
            </p>
            <p className="mt-1 text-base font-bold leading-tight tracking-tight tabular-nums text-primary-contrast/80 sm:text-lg">
              {formatSen(f.totalFixedSen)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-primary-contrast/60">
              Left after fixed
            </p>
            <p className="mt-1 text-base font-bold leading-tight tracking-tight tabular-nums text-primary-contrast sm:text-lg">
              {formatSen(f.disposableSen)}
            </p>
          </div>
        </div>
      </section>

      <Card title="Today's spending" className="break-inside-avoid lg:mb-4" action={<a href="#" onClick={(e) => { e.preventDefault(); onGoToSpend(); }} className="text-xs font-semibold text-gold hover:underline">Details →</a>}>
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
        <div className="mt-3 flex justify-between text-xs text-ink-faint">
          <span>{isCycle ? 'Cycle' : 'Month'} to date</span>
          <span className={f.spending.overspent ? 'text-negative' : ''}>
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
                    <span className="text-ink-soft">{c.name}</span>
                    <span className={`tabular-nums ${over ? 'text-negative' : 'text-ink-faint'}`}>
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

      <div className="break-inside-avoid space-y-3">
        <Disclaimer>
          Estimates only — not financial or tax advice. Confirm against your payslip and LHDN / KWSP /
          PERKESO.
        </Disclaimer>
        <p className="text-center text-xs text-ink-faint">
          Want a printable report or an Excel export?{' '}
          <button
            type="button"
            onClick={onOpenSettings}
            className="font-medium text-gold underline-offset-2 hover:underline"
          >
            Open Download &amp; Print (in Settings ⚙)
          </button>
        </p>
      </div>
    </div>
  );
}
