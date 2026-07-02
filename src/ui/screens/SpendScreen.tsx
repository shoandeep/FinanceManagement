import { useState } from 'react';
import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO, parseISO, daysInMonth as daysInMonthOf, dayOfMonth, addDaysISO, daysBetweenISO } from '../../budget/dates';
import { newId } from '../../model/defaults';
import { formatSen, type Sen } from '../../money/money';
import type { SpendPeriod } from '../../budget/spendingPlan';
import type { PaymentMethod, DebtKind } from '../../model/types';
import { paymentTotals, PAYMENT_METHODS, PAYMENT_EMOJI } from '../../budget/payments';
import { Card, Money, MoneyInput, TextInput, Select, Button, Stat, ProgressBar, Disclaimer } from '../components';
import { CategoryDonut, DailyBars } from '../charts';
import { Transactions } from '../Transactions';
import { TransferLog } from '../TransferLog';

const DEBT_KINDS: { id: DebtKind; label: string }[] = [
  { id: 'credit', label: 'Credit card' },
  { id: 'bnpl', label: 'BNPL' },
];

/** Due-date status for a debt's current bill. */
function dueStatus(dueDate: string | undefined, today: string): { text: string; tone: string } | null {
  if (!dueDate) return null;
  const days = daysBetweenISO(today, dueDate);
  if (days < 0) return { text: `Overdue ${-days}d`, tone: 'text-negative' };
  if (days === 0) return { text: 'Due today', tone: 'text-negative' };
  if (days <= 7) return { text: `Due in ${days}d`, tone: 'text-warning' };
  return { text: `Due ${new Date(`${dueDate}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`, tone: 'text-ink-faint' };
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

/** Segmented "slider" to switch period. */
function PeriodSlider({
  value,
  onChange,
  periods,
}: {
  value: SpendPeriod;
  onChange: (p: SpendPeriod) => void;
  periods: { id: SpendPeriod; label: string }[];
}) {
  const index = periods.findIndex((p) => p.id === value);
  return (
    <div className="relative grid grid-cols-3 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line">
      <div
        className="absolute inset-y-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-primary shadow-sm transition-transform duration-300"
        style={{ transform: `translateX(${index * 100}%)` }}
        aria-hidden
      />
      {periods.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          aria-pressed={value === p.id}
          className={`relative z-10 rounded-lg py-1.5 text-sm font-semibold transition ${
            value === p.id ? 'text-primary-contrast' : 'text-ink-faint hover:text-ink'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function SpendScreen() {
  const { data, update } = useVault();
  const today = todayISO();
  const [period, setPeriod] = useState<SpendPeriod>('day');
  const [amount, setAmount] = useState<Sen>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod | undefined>(undefined);
  const [date, setDate] = useState<string>(today);
  const [note, setNote] = useState('');
  const [txnsOpen, setTxnsOpen] = useState(false);

  if (!data) return null;
  const f = deriveFinances(data, today);
  const plan = f.spending;
  const m = plan[period]; // metrics for the selected period
  const cats = data.variableCategories;
  const activeCat = categoryId || cats[0]?.id || '';

  // Pay-cycle vs calendar-month labelling.
  const isCycle = (data.payPeriod?.mode ?? 'calendarMonth') !== 'calendarMonth';
  const cycleWord = isCycle ? 'cycle' : 'month';
  const PERIODS: { id: SpendPeriod; label: string }[] = [
    { id: 'day', label: 'Daily' },
    { id: 'week', label: 'Weekly' },
    { id: 'month', label: isCycle ? 'Cycle' : 'Monthly' },
  ];
  const UNIT: Record<SpendPeriod, string> = { day: 'day', week: 'week', month: cycleWord };
  const NOUN: Record<SpendPeriod, string> = {
    day: 'today',
    week: 'this week',
    month: isCycle ? 'this cycle' : 'this month',
  };
  const periodRange = `${shortDate(plan.periodStartISO)} – ${shortDate(addDaysISO(plan.periodEndISO, -1))}`;

  const monthExpenses = data.expenses
    .filter((e) => e.dateISO.slice(0, 7) === today.slice(0, 7))
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? 'Uncategorised';

  function logExpense() {
    if (amount <= 0 || !activeCat) return;
    update((d) =>
      d.expenses.push({
        id: newId(),
        categoryId: activeCat,
        amountSen: amount,
        dateISO: date,
        ...(method ? { method } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    );
    setAmount(0);
    setNote('');
  }

  // Payment-method analytics.
  const methodTotals = paymentTotals(monthExpenses);
  const debts = data.debts ?? [];
  const totalOwedSen = debts.reduce((s, d) => s + d.balanceSen, 0);

  const shareSum = cats.reduce((s, c) => s + c.sharePercent, 0);

  // Chart data. The daily-bars chart is always a calendar-month view, independent
  // of the (possibly cross-month) pay cycle, so compute its days locally.
  const { year, month } = parseISO(today);
  const calDays = daysInMonthOf(year, month);
  const calToday = dayOfMonth(today);
  const donutItems = plan.categories.map((c) => ({ name: c.name, value: c.month.spentSen }));
  const dayTotals: number[] = new Array(calDays).fill(0);
  data.expenses
    .filter((e) => e.dateISO.slice(0, 7) === today.slice(0, 7))
    .forEach((e) => {
      const d = parseInt(e.dateISO.slice(8, 10), 10);
      if (d >= 1 && d <= calDays) dayTotals[d - 1] += e.amountSen;
    });
  const dailyDays = dayTotals.map((v, i) => ({ day: i + 1, value: v, today: i + 1 === calToday }));
  const hasSpend = plan.spentMonthSen > 0;

  return (
    <div className="space-y-4">
      <Card title="Spending plan">
        <PeriodSlider value={period} onChange={setPeriod} periods={PERIODS} />
        {isCycle && (
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            Pay cycle &middot; {periodRange} &middot; {plan.daysInMonth} days
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Stat
            label={`Average per ${UNIT[period]}`}
            value={<Money sen={m.averageSen} />}
            sub={`of ${formatSen(plan.monthlyBudgetSen)} / ${cycleWord}`}
          />
          <Stat
            label={`Left ${NOUN[period]}`}
            value={<Money sen={m.leftSen} signed />}
            tone={m.leftSen < 0 ? 'negative' : 'positive'}
            sub={`Spent ${formatSen(m.spentSen)}`}
          />
        </div>
        <div className="mt-3 rounded-lg border border-gold/15 bg-gold/[0.06] px-3 py-2 text-xs text-ink-soft">
          To stay on budget you can spend{' '}
          <strong className="text-gold">{formatSen(m.onPaceSen)}</strong> this{' '}
          {UNIT[period]} (uses the remaining {formatSen(plan.remainingMonthSen)} over the{' '}
          {plan.daysRemaining} day{plan.daysRemaining === 1 ? '' : 's'} left).
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink-faint">
          <span>{isCycle ? 'Cycle' : 'Month'} to date</span>
          <span className={plan.overspent ? 'text-negative' : ''}>
            {formatSen(plan.spentMonthSen)} / {formatSen(plan.monthlyBudgetSen)}
          </span>
        </div>
      </Card>

      <Card title="Log an expense">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-soft">
            Amount
            <div className="mt-1">
              <MoneyInput valueSen={amount} onChangeSen={setAmount} />
            </div>
          </label>
          <label className="text-xs text-ink-soft">
            Category
            <Select className="mt-1" value={activeCat} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-ink-soft">
            Date
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="text-xs text-ink-soft">
            Vendor / note
            <TextInput
              className="mt-1"
              value={note}
              placeholder="e.g. Grab, Tesco"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3">
          <p className="text-xs text-ink-soft">Paid with</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((pm) => {
              const on = method === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMethod(on ? undefined : pm.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    on
                      ? 'bg-primary text-primary-contrast'
                      : 'bg-surface-2 text-ink-soft ring-1 ring-inset ring-line hover:text-ink'
                  }`}
                >
                  {pm.emoji} {pm.label}
                </button>
              );
            })}
          </div>
        </div>
        <Button variant="primary" className="mt-3 w-full" onClick={logExpense} disabled={amount <= 0}>
          Add expense
        </Button>
      </Card>

      <Card
        title="Cards & BNPL"
        className={totalOwedSen > 0 ? 'border-warning/30' : ''}
        action={
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() => update((d) => d.debts.push({ id: newId(), name: '', kind: 'credit', balanceSen: 0 }))}
          >
            + Add
          </Button>
        }
      >
        {debts.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Add your credit cards &amp; BNPL apps (Atome, SPayLater, …) with what you currently owe and
            the due date. Then log repayments from the <span className="font-semibold text-gold">＋</span>{' '}
            (Repay) to draw them down.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total owed</span>
              <span className="font-bold tabular-nums text-ink">
                <Money sen={totalOwedSen} />
              </span>
            </div>
            <ul className="space-y-3">
              {debts.map((debt) => {
                const patchDebt = (fn: (a: typeof debt) => void) =>
                  update((d) => {
                    const it = d.debts.find((x) => x.id === debt.id);
                    if (it) fn(it);
                  });
                const status = dueStatus(debt.dueDate, today);
                return (
                  <li key={debt.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <TextInput
                        aria-label="Debt name"
                        placeholder={debt.kind === 'bnpl' ? 'e.g. Atome' : 'e.g. Maybank Visa'}
                        value={debt.name}
                        onChange={(e) => patchDebt((a) => (a.name = e.target.value))}
                      />
                      <Select
                        aria-label="Debt type"
                        className="w-28"
                        value={debt.kind}
                        onChange={(e) => patchDebt((a) => (a.kind = e.target.value as DebtKind))}
                      >
                        {DEBT_KINDS.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="danger"
                        className="px-2"
                        aria-label={`Remove ${debt.name || 'debt'}`}
                        onClick={() =>
                          update((d) => {
                            d.debts = d.debts.filter((x) => x.id !== debt.id);
                            d.transfers = d.transfers.filter((x) => !(x.kind === 'debt' && x.targetId === debt.id));
                          })
                        }
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-xs text-ink-faint">
                        Owed now
                        <div className="mt-1">
                          <MoneyInput valueSen={debt.balanceSen} onChangeSen={(sen) => patchDebt((a) => (a.balanceSen = sen))} />
                        </div>
                      </label>
                      <label className="text-xs text-ink-faint">
                        Due date
                        <input
                          type="date"
                          value={debt.dueDate ?? ''}
                          aria-label="Due date"
                          onChange={(e) =>
                            patchDebt((a) => {
                              if (e.target.value) a.dueDate = e.target.value;
                              else delete a.dueDate;
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                      </label>
                    </div>
                    {status && <p className={`mt-1.5 text-[11px] font-medium ${status.tone}`}>{status.text}</p>}
                    <TransferLog kind="debt" targetId={debt.id} />
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-ink-faint">
              Set what you owe now; log repayments from the ＋ (Repay) to lower it. Tip: tag card/BNPL
              spending in &ldquo;Paid with&rdquo; so you can see how fast it builds up.
            </p>
          </>
        )}
      </Card>

      <Card title="Where your money goes">
        <CategoryDonut items={donutItems} />
      </Card>

      {hasSpend && (
        <Card title="Daily spending this month">
          <DailyBars days={dailyDays} refValue={plan.day.averageSen} />
        </Card>
      )}

      <Card title={`By category · ${PERIODS.find((p) => p.id === period)!.label.toLowerCase()}`}>
        <ul className="space-y-3">
          {plan.categories.map((c) => {
            const cm = c[period];
            const avg = cm.averageSen;
            const pct = avg > 0 ? Math.min(100, (cm.spentSen / avg) * 100) : 0;
            const over = cm.leftSen < 0;
            return (
              <li key={c.categoryId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{c.name}</span>
                  <span
                    className={`tabular-nums ${over ? 'text-negative' : 'text-ink-faint'}`}
                  >
                    {formatSen(cm.spentSen)} / {formatSen(avg)}
                  </span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={pct} tone={over ? 'amber' : 'indigo'} label={`${c.name} spent`} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {methodTotals.totalSen > 0 && (
        <Card title="This month by payment method">
          <ul className="space-y-2">
            {PAYMENT_METHODS.filter((pm) => methodTotals.byMethod[pm.id] > 0).map((pm) => {
              const v = methodTotals.byMethod[pm.id];
              const pct = methodTotals.totalSen > 0 ? Math.round((v / methodTotals.totalSen) * 100) : 0;
              return (
                <li key={pm.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink-soft">
                    {pm.emoji} {pm.label}
                  </span>
                  <span className="tabular-nums text-ink">
                    {formatSen(v)} <span className="text-xs text-ink-faint">· {pct}%</span>
                  </span>
                </li>
              );
            })}
            {methodTotals.untaggedSen > 0 && (
              <li className="flex items-center justify-between gap-2 text-sm text-ink-faint">
                <span>Untagged</span>
                <span className="tabular-nums">{formatSen(methodTotals.untaggedSen)}</span>
              </li>
            )}
          </ul>
        </Card>
      )}

      <Card
        title={`This month's expenses (${monthExpenses.length})`}
        action={
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setTxnsOpen(true)}>
            View all
          </Button>
        }
      >
        {monthExpenses.length === 0 ? (
          <p className="text-sm text-ink-faint">Nothing logged this month.</p>
        ) : (
          <ul className="divide-y divide-line">
            {monthExpenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink-soft">
                    {e.method ? `${PAYMENT_EMOJI[e.method]} ` : ''}
                    {catName(e.categoryId)}
                    {e.note ? <span className="text-ink-faint"> · {e.note}</span> : null}
                  </p>
                  <p className="text-xs text-ink-faint">{e.dateISO}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{formatSen(e.amountSen)}</span>
                  <Button
                    variant="danger"
                    className="px-2"
                    aria-label="Remove expense"
                    onClick={() => update((d) => void (d.expenses = d.expenses.filter((x) => x.id !== e.id)))}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Categories"
        action={
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() =>
              update((d) => d.variableCategories.push({ id: newId(), name: 'New', sharePercent: 0 }))
            }
          >
            + Add
          </Button>
        }
      >
        <ul className="space-y-2">
          {cats.map((c) => (
            <li key={c.id} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
              <TextInput
                aria-label="Category name"
                value={c.name}
                onChange={(e) =>
                  update((d) => {
                    const item = d.variableCategories.find((x) => x.id === c.id);
                    if (item) item.name = e.target.value;
                  })
                }
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label={`${c.name} share percent`}
                  value={c.sharePercent}
                  onChange={(e) =>
                    update((d) => {
                      const item = d.variableCategories.find((x) => x.id === c.id);
                      if (item) item.sharePercent = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    })
                  }
                  className="w-full rounded-lg border border-line-strong bg-surface-2 px-2 py-2 text-right text-sm tabular-nums text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
                />
                <span className="text-sm text-ink-faint">%</span>
              </div>
              <Button
                variant="danger"
                className="px-2"
                aria-label={`Remove ${c.name}`}
                onClick={() =>
                  update((d) => void (d.variableCategories = d.variableCategories.filter((x) => x.id !== c.id)))
                }
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
        <p
          className={`mt-2 text-xs ${shareSum === 100 ? 'text-ink-faint' : 'text-warning'}`}
        >
          Shares total {shareSum}% of the {formatSen(plan.monthlyBudgetSen)} variable budget.
        </p>
      </Card>

      <Disclaimer>
        Average shows an even split of your monthly budget (it won&apos;t spike late in the month). &ldquo;On
        pace&rdquo; distributes whatever budget is left over the days remaining.
      </Disclaimer>

      {txnsOpen && <Transactions onClose={() => setTxnsOpen(false)} />}
    </div>
  );
}
