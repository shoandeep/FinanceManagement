import { useState } from 'react';
import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { newId } from '../../model/defaults';
import { formatSen, type Sen } from '../../money/money';
import { Card, Money, MoneyInput, TextInput, Select, Button, Stat, ProgressBar, Disclaimer } from '../components';

export function SpendScreen() {
  const { data, update } = useVault();
  const today = todayISO();
  const [amount, setAmount] = useState<Sen>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [note, setNote] = useState('');

  if (!data) return null;
  const f = deriveFinances(data, today);
  const cats = data.variableCategories;
  const activeCat = categoryId || cats[0]?.id || '';

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
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    );
    setAmount(0);
    setNote('');
  }

  const shareSum = cats.reduce((s, c) => s + c.sharePercent, 0);

  return (
    <div className="space-y-4">
      <Card title="Today's allowance">
        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Left today"
            value={<Money sen={f.daily.leftTodaySen} signed />}
            tone={f.daily.leftTodaySen < 0 ? 'negative' : 'positive'}
            sub={`Daily budget ${formatSen(f.daily.dailyAllowanceSen)}`}
          />
          <Stat
            label="Spent today"
            value={<Money sen={f.daily.spentTodaySen} />}
            sub={`${f.daily.daysRemaining} days left in month`}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>Month to date</span>
          <span className={f.daily.overspent ? 'text-red-500' : ''}>
            {formatSen(f.daily.spentMonthSen)} / {formatSen(f.daily.variableBudgetSen)}
          </span>
        </div>
      </Card>

      <Card title="Log an expense">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Amount
            <div className="mt-1">
              <MoneyInput valueSen={amount} onChangeSen={setAmount} />
            </div>
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Category
            <Select
              className="mt-1"
              value={activeCat}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Date
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Note (optional)
            <TextInput className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <Button variant="primary" className="mt-3 w-full" onClick={logExpense} disabled={amount <= 0}>
          Add expense
        </Button>
      </Card>

      <Card title="Per-category allowance">
        <ul className="space-y-3">
          {f.daily.categories.map((c) => {
            const pct = c.monthlyBudgetSen > 0 ? (c.spentMonthSen / c.monthlyBudgetSen) * 100 : 0;
            const over = c.remainingMonthSen < 0;
            return (
              <li key={c.categoryId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{c.name}</span>
                  <span
                    className={`tabular-nums ${over ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {formatSen(c.dailyAllowanceSen)}/day
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

      <Card title={`This month's expenses (${monthExpenses.length})`}>
        {monthExpenses.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nothing logged this month.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthExpenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-slate-700 dark:text-slate-200">
                    {catName(e.categoryId)}
                    {e.note ? <span className="text-slate-400"> · {e.note}</span> : null}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{e.dateISO}</p>
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-sm tabular-nums outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
                />
                <span className="text-sm text-slate-400">%</span>
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
          className={`mt-2 text-xs ${shareSum === 100 ? 'text-slate-400 dark:text-slate-500' : 'text-amber-600 dark:text-amber-400'}`}
        >
          Shares total {shareSum}% of the {formatSen(f.daily.variableBudgetSen)} variable budget.
        </p>
      </Card>

      <Disclaimer>Daily allowance recomputes live as you log expenses and as the month progresses.</Disclaimer>
    </div>
  );
}
