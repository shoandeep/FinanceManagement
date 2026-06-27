import { useState } from 'react';
import { useVault } from '../../state/VaultContext';
import {
  todayISO,
  parseISO,
  daysInMonth,
  dayOfWeekMon0,
  startOfWeekISO,
  addDaysISO,
} from '../../budget/dates';
import { isoOf, eventsOnDate, monthList, summarize, eventDirection } from '../../budget/calendar';
import { newId } from '../../model/defaults';
import { formatSen } from '../../money/money';
import type { EventType, EventFreq, RecurringEvent } from '../../model/types';
import { Card, Money, MoneyInput, TextInput, Select, Button, Stat } from '../components';

const EVENT_META: Record<EventType, { label: string; color: string }> = {
  income: { label: 'Income', color: '#1f9e88' },
  subscription: { label: 'Subscription', color: '#8e6fae' },
  savings: { label: 'Savings', color: '#3a8f9b' },
  investment: { label: 'Investment', color: '#caa23a' },
  bnpl: { label: 'BNPL', color: '#e0973a' },
  creditcard: { label: 'Card due', color: '#b94a5a' },
  bill: { label: 'Bill', color: '#7d9b3f' },
};
const TYPE_ORDER: EventType[] = ['income', 'subscription', 'bill', 'savings', 'investment', 'bnpl', 'creditcard'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addMonthsISO(iso: string, delta: number): string {
  const { year, month, day } = parseISO(iso);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return isoOf(y, m, Math.min(day, daysInMonth(y, m)));
}
const longDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', opts);

function Dots({ events }: { events: RecurringEvent[] }) {
  return (
    <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
      {events.slice(0, 4).map((e, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_META[e.type].color }} />
      ))}
      {events.length > 4 && <span className="text-[8px] leading-none text-ink-faint">+{events.length - 4}</span>}
    </div>
  );
}

function DayField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (n: number) => void }) {
  return (
    <label className="text-xs text-ink-faint">
      {label}
      <input
        type="number"
        min={1}
        max={31}
        value={value ?? ''}
        placeholder="1"
        aria-label={label}
        onChange={(e) => onChange(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

export function CalendarScreen() {
  const { data, update } = useVault();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [focus, setFocus] = useState(todayISO());
  if (!data) return null;

  const events = data.recurringEvents ?? [];
  const today = todayISO();
  const { year, month } = parseISO(focus);

  // Build the grid cells + the period's day list.
  const cells: { dateISO: string; day: number; inMonth: boolean; isToday: boolean; events: RecurringEvent[] }[] = [];
  if (view === 'month') {
    const first = isoOf(year, month, 1);
    const lead = dayOfWeekMon0(first);
    const dim = daysInMonth(year, month);
    const total = Math.ceil((lead + dim) / 7) * 7;
    const gridStart = addDaysISO(first, -lead);
    for (let i = 0; i < total; i++) {
      const dISO = addDaysISO(gridStart, i);
      const p = parseISO(dISO);
      cells.push({ dateISO: dISO, day: p.day, inMonth: p.month === month, isToday: dISO === today, events: eventsOnDate(events, dISO) });
    }
  } else {
    const ws = startOfWeekISO(focus);
    for (let i = 0; i < 7; i++) {
      const dISO = addDaysISO(ws, i);
      const p = parseISO(dISO);
      cells.push({ dateISO: dISO, day: p.day, inMonth: true, isToday: dISO === today, events: eventsOnDate(events, dISO) });
    }
  }
  const list =
    view === 'month'
      ? monthList(events, year, month)
      : cells.filter((c) => c.events.length).map((c) => ({ day: c.day, dateISO: c.dateISO, events: c.events }));
  const summary = summarize(list);

  const periodLabel =
    view === 'month'
      ? longDate(focus, { month: 'long', year: 'numeric' })
      : `${longDate(cells[0].dateISO, { day: 'numeric', month: 'short' })} – ${longDate(cells[6].dateISO, { day: 'numeric', month: 'short' })}`;
  const go = (delta: number) => setFocus(view === 'month' ? addMonthsISO(focus, delta) : addDaysISO(focus, delta * 7));

  return (
    <div className="space-y-4">
      <Card className="kain-edge">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={() => go(-1)} aria-label="Previous" className="rounded-lg px-3 py-1 text-lg text-ink-faint transition hover:bg-gold/10">
            ‹
          </button>
          <div className="text-center">
            <p className="font-display text-base font-semibold">{periodLabel}</p>
            <button onClick={() => setFocus(today)} className="text-[11px] text-gold hover:underline">
              Today
            </button>
          </div>
          <button onClick={() => go(1)} aria-label="Next" className="rounded-lg px-3 py-1 text-lg text-ink-faint transition hover:bg-gold/10">
            ›
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line">
          {(['month', 'week'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-lg py-1.5 text-sm font-semibold capitalize transition ${
                view === v ? 'bg-primary text-primary-contrast' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-ink-faint">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w[0]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => (
            <div
              key={i}
              title={c.events.map((e) => e.name || EVENT_META[e.type].label).join(', ')}
              className={`min-h-[3rem] rounded-lg p-1 text-center text-xs ${c.inMonth ? '' : 'opacity-35'} ${
                c.isToday ? 'ring-2 ring-gold' : 'ring-1 ring-line'
              } ${c.events.length ? 'bg-surface-2' : ''}`}
            >
              <div className={`leading-none ${c.isToday ? 'font-bold text-gold' : 'text-ink'}`}>{c.day}</div>
              <Dots events={c.events} />
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
          <Stat label="In" value={<Money sen={summary.inSen} />} tone="positive" />
          <Stat label="Out" value={<Money sen={summary.outSen} />} tone="negative" />
          <Stat label="Net" value={<Money sen={summary.netSen} signed />} tone={summary.netSen < 0 ? 'negative' : 'positive'} />
        </div>
      </Card>

      <Card title={view === 'month' ? 'This month' : 'This week'}>
        {list.length === 0 ? (
          <p className="text-sm text-ink-faint">No events in this {view}. Add your recurring money events below.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((d) => (
              <li key={d.dateISO}>
                <p className={`mb-1 text-xs font-semibold ${d.dateISO === today ? 'text-gold' : 'text-ink-soft'}`}>
                  {longDate(d.dateISO, { weekday: 'short', day: 'numeric', month: 'short' })}
                  {d.dateISO === today ? ' · Today' : ''}
                </p>
                <ul className="space-y-1.5">
                  {d.events.map((e, i) => {
                    const inn = eventDirection(e.type) === 'in';
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: EVENT_META[e.type].color }} />
                        <span className="truncate text-ink">{e.name || EVENT_META[e.type].label}</span>
                        <span className="shrink-0 text-[10px] text-ink-faint">{EVENT_META[e.type].label}</span>
                        <span className={`ml-auto shrink-0 tabular-nums font-semibold ${inn ? 'text-positive' : 'text-ink'}`}>
                          {inn ? '+' : '−'}
                          {formatSen(e.amountSen)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Your recurring events"
        action={
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() =>
              update((d) =>
                d.recurringEvents.push({
                  id: newId(),
                  name: '',
                  type: 'subscription',
                  amountSen: 0,
                  freq: 'monthly',
                  dayOfMonth: parseInt(today.slice(8, 10), 10),
                }),
              )
            }
          >
            + Add
          </Button>
        }
      >
        {events.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Add subscriptions, your paycheck, savings/investment auto-deposits, BNPL instalments and
            card due dates to see them on the calendar.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => {
              const patch = (fn: (a: RecurringEvent) => void) =>
                update((d) => {
                  const it = d.recurringEvents.find((x) => x.id === ev.id);
                  if (it) fn(it);
                });
              return (
                <li key={ev.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Event name"
                      placeholder="e.g. Netflix"
                      value={ev.name}
                      onChange={(e) => patch((a) => void (a.name = e.target.value))}
                    />
                    <Select
                      aria-label="Type"
                      className="w-32"
                      value={ev.type}
                      onChange={(e) => patch((a) => void (a.type = e.target.value as EventType))}
                    >
                      {TYPE_ORDER.map((t) => (
                        <option key={t} value={t}>
                          {EVENT_META[t].label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="danger"
                      className="px-2"
                      aria-label={`Remove ${ev.name || 'event'}`}
                      onClick={() => update((d) => void (d.recurringEvents = d.recurringEvents.filter((x) => x.id !== ev.id)))}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-faint">
                      Amount
                      <div className="mt-1">
                        <MoneyInput valueSen={ev.amountSen} onChangeSen={(sen) => patch((a) => void (a.amountSen = sen))} />
                      </div>
                    </label>
                    <label className="text-xs text-ink-faint">
                      Repeats
                      <Select className="mt-1" value={ev.freq} onChange={(e) => patch((a) => void (a.freq = e.target.value as EventFreq))}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                        <option value="once">One-off</option>
                      </Select>
                    </label>
                  </div>
                  <div className="mt-2">
                    {ev.freq === 'monthly' && (
                      <DayField label="Day of month" value={ev.dayOfMonth} onChange={(n) => patch((a) => void (a.dayOfMonth = n))} />
                    )}
                    {ev.freq === 'weekly' && (
                      <label className="text-xs text-ink-faint">
                        On
                        <Select className="mt-1" value={String(ev.weekday ?? 0)} onChange={(e) => patch((a) => void (a.weekday = Number(e.target.value)))}>
                          {WEEKDAYS.map((w, i) => (
                            <option key={i} value={i}>
                              {w}
                            </option>
                          ))}
                        </Select>
                      </label>
                    )}
                    {ev.freq === 'yearly' && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-ink-faint">
                          Month
                          <Select className="mt-1" value={String(ev.month ?? 1)} onChange={(e) => patch((a) => void (a.month = Number(e.target.value)))}>
                            {MONTHS.map((m, i) => (
                              <option key={i} value={i + 1}>
                                {m}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <DayField label="Day" value={ev.dayOfMonth} onChange={(n) => patch((a) => void (a.dayOfMonth = n))} />
                      </div>
                    )}
                    {ev.freq === 'once' && (
                      <label className="text-xs text-ink-faint">
                        Date
                        <input
                          type="date"
                          aria-label="Event date"
                          value={ev.dateISO ?? ''}
                          onChange={(e) =>
                            patch((a) => {
                              if (e.target.value) a.dateISO = e.target.value;
                              else delete a.dateISO;
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-ink-faint">
          Calendar items are reminders — they don't move money. Tracking only.
        </p>
      </Card>
    </div>
  );
}
