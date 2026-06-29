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
import {
  isoOf,
  eventsOnDate,
  monthList,
  summarize,
  eventDirection,
  dayNet,
  projectBalances,
  fixedCostsAsEvents,
  isFixedCostEvent,
} from '../../budget/calendar';
import { eventEmoji, brandEmoji } from '../../budget/brand';
import { holidaysOn } from '../../budget/holidays';
import { paydayForMonth } from '../../budget/payperiod';
import { cashSummary } from '../../budget/cash';
import { newId } from '../../model/defaults';
import { formatSen, type Sen } from '../../money/money';
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
const HOLIDAY_COLOR = '#c0476a'; // festive crimson, distinct from the money chips
const PAYDAY_COLOR = '#caa23a'; // gold

/* --------------------------------------------------------------- helpers */
function tint(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
/** Compact ringgit for tight spaces: RM349, RM1.2k, -RM90. */
function compactRM(sen: Sen): string {
  const neg = sen < 0;
  const r = Math.abs(sen) / 100;
  const body = r >= 1000 ? `${(r / 1000).toFixed(r >= 10000 ? 0 : 1)}k` : `${Math.round(r)}`;
  return `${neg ? '-' : ''}RM${body}`;
}
/** Compact magnitude (no sign) for chips. */
function compactMag(sen: Sen): string {
  const r = Math.abs(sen) / 100;
  return r >= 1000 ? `RM${(r / 1000).toFixed(r >= 10000 ? 0 : 1)}k` : `RM${Math.round(r)}`;
}
function addMonthsISO(iso: string, delta: number): string {
  const { year, month, day } = parseISO(iso);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return isoOf(y, m, Math.min(day, daysInMonth(y, m)));
}
const longDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', opts);

/* ------------------------------------------------------------------ Chip */
function Chip({ ev }: { ev: RecurringEvent }) {
  const meta = EVENT_META[ev.type];
  const inn = eventDirection(ev.type) === 'in';
  return (
    <div
      className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[10px] leading-tight"
      style={{ background: tint(meta.color, 0.16) }}
      title={`${ev.name || meta.label} · ${inn ? '+' : '−'}${formatSen(ev.amountSen)}`}
    >
      <span className="shrink-0">{eventEmoji(ev)}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{ev.name || meta.label}</span>
      <span className={`shrink-0 tabular-nums font-semibold ${inn ? 'text-positive' : 'text-ink-soft'}`}>
        {inn ? '+' : '−'}
        {compactMag(ev.amountSen)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- DayField */
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
  const [selectedISO, setSelectedISO] = useState(todayISO());
  if (!data) return null;

  const recurring = data.recurringEvents ?? [];
  // Display + forecast include fixed monthly costs (managed in Budget) so the
  // calendar shows every outgoing in one place.
  const events = [...recurring, ...fixedCostsAsEvents(data.fixedCosts)];
  const today = todayISO();
  const { year, month } = parseISO(focus);

  // Build the grid cells for the active period.
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

  // State-aware public holidays + payday markers (non-money) for the visible period.
  const state = data.profile?.state;
  const payCfg = data.payPeriod ?? { mode: 'calendarMonth' as const, dayOfMonth: 25, customDates: {} };
  const paydaySet = new Set<string>();
  if (payCfg.mode !== 'calendarMonth') {
    const monthKeys = new Set(cells.map((c) => c.dateISO.slice(0, 7)));
    // A payday can shift earlier into view, so also scan the month after the last cell.
    const lp = parseISO(cells[cells.length - 1].dateISO);
    const nxt = new Date(Date.UTC(lp.year, lp.month, 1));
    monthKeys.add(`${nxt.getUTCFullYear()}-${String(nxt.getUTCMonth() + 1).padStart(2, '0')}`);
    for (const mk of monthKeys) {
      const [y, m] = mk.split('-').map(Number);
      paydaySet.add(paydayForMonth(payCfg, y, m, state));
    }
  }
  // Holidays + paydays falling inside the visible period (in-month days only for month view).
  const marks = cells
    .filter((c) => view === 'week' || c.inMonth)
    .map((c) => ({ dateISO: c.dateISO, hols: holidaysOn(c.dateISO, state), isPayday: paydaySet.has(c.dateISO) }))
    .filter((m) => m.hols.length || m.isPayday);

  // Forward running-balance forecast, anchored on current cash (Save → balances).
  const anchorSen = cashSummary(data.cashAccounts ?? [], today).totalBalanceSen;
  const hasAnchor = anchorSen > 0;
  const periodEndISO = cells[cells.length - 1].dateISO;
  const forecast = ((): {
    balances: Map<string, Sen>;
    endBal: Sen;
    lowISO: string;
    lowBal: Sen;
    count: number;
  } | null => {
    if (!hasAnchor || periodEndISO < today) return null;
    const balances = projectBalances(events, anchorSen, today, periodEndISO);
    const endBal = balances.get(periodEndISO) ?? anchorSen;
    let lowISO = today;
    let lowBal = Infinity;
    for (const [d, b] of balances) {
      if (b < lowBal) {
        lowBal = b;
        lowISO = d;
      }
    }
    let count = 0;
    for (let cur = today; cur <= periodEndISO; cur = addDaysISO(cur, 1)) count += eventsOnDate(events, cur).length;
    return { balances, endBal, lowISO, lowBal, count };
  })();

  const weather = forecast
    ? forecast.lowBal < 0
      ? { icon: '🌧️', label: 'Stormy stretch' }
      : forecast.lowBal < 20_000
        ? { icon: '⛅', label: 'Tight days ahead' }
        : { icon: '☀️', label: 'Clear skies' }
    : null;

  const periodLabel =
    view === 'month'
      ? longDate(focus, { month: 'long', year: 'numeric' })
      : `${longDate(cells[0].dateISO, { day: 'numeric', month: 'short' })} – ${longDate(cells[6].dateISO, { day: 'numeric', month: 'short' })}`;
  const go = (delta: number) => setFocus(view === 'month' ? addMonthsISO(focus, delta) : addDaysISO(focus, delta * 7));
  const selectDay = (iso: string, inMonth: boolean) => {
    setSelectedISO(iso);
    if (view === 'month' && !inMonth) setFocus(iso);
  };

  const selectedEvents = eventsOnDate(events, selectedISO);
  const selectedBal = forecast?.balances.get(selectedISO);
  const selectedNet = dayNet(events, selectedISO);
  const selectedHols = holidaysOn(selectedISO, state);
  const selectedIsPayday = paydaySet.has(selectedISO);

  return (
    <div className="space-y-4">
      {/* Forecast banner */}
      {forecast && weather ? (
        <Card className="kain-edge border-positive/30">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">{weather.icon}</span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-ink">{weather.label}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                After {forecast.count} {forecast.count === 1 ? 'event' : 'events'} through{' '}
                {longDate(periodEndISO, { day: 'numeric', month: 'short' })}, you're projected to have{' '}
                <span className="font-semibold text-ink">{formatSen(forecast.endBal)}</span>.
              </p>
              {forecast.lowBal < forecast.endBal && (
                <p className="mt-0.5 text-xs text-ink-faint">
                  Low point {compactRM(forecast.lowBal)} on {longDate(forecast.lowISO, { weekday: 'short', day: 'numeric', month: 'short' })}.
                </p>
              )}
            </div>
          </div>
        </Card>
      ) : (
        !hasAnchor && (
          <Card className="kain-edge">
            <p className="text-sm text-ink-soft">
              💡 Add your bank & e-wallet balances under <span className="font-semibold text-gold">Save → Advanced</span> to
              see a running balance forecast across the month.
            </p>
          </Card>
        )
      )}

      {/* Calendar */}
      <Card className="kain-edge">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={() => go(-1)} aria-label="Previous" className="rounded-lg px-3 py-1 text-lg text-ink-faint transition hover:bg-gold/10">
            ‹
          </button>
          <div className="text-center">
            <p className="font-display text-base font-semibold">{periodLabel}</p>
            <button onClick={() => { setFocus(today); setSelectedISO(today); }} className="text-[11px] text-gold hover:underline">
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
          {cells.map((c, i) => {
            const bal = forecast?.balances.get(c.dateISO);
            const isLow = forecast && c.dateISO === forecast.lowISO && c.dateISO >= today;
            const selected = c.dateISO === selectedISO;
            const hols = holidaysOn(c.dateISO, state);
            const isPayday = paydaySet.has(c.dateISO);
            const shown = c.events.slice(0, view === 'week' ? 5 : 3);
            return (
              <button
                key={i}
                onClick={() => selectDay(c.dateISO, c.inMonth)}
                aria-pressed={selected}
                aria-label={`${longDate(c.dateISO, { weekday: 'long', day: 'numeric', month: 'long' })}${c.events.length ? `, ${c.events.length} events` : ''}`}
                className={`flex flex-col rounded-lg p-1 text-left align-top transition ${view === 'week' ? 'min-h-[7rem]' : 'min-h-[4rem]'} ${
                  c.inMonth ? '' : 'opacity-40'
                } ${selected ? 'bg-primary/10 ring-2 ring-primary' : c.isToday ? 'ring-2 ring-gold' : 'ring-1 ring-line hover:ring-gold/40'}`}
              >
                <span className={`text-xs leading-none ${c.isToday ? 'font-bold text-gold' : 'text-ink'}`}>{c.day}</span>
                {bal != null && (
                  <span
                    className={`mt-0.5 block w-full truncate rounded px-0.5 text-center text-[9px] font-semibold leading-tight tabular-nums ${
                      isLow
                        ? 'bg-positive/20 text-positive'
                        : bal < 0
                          ? 'bg-negative/15 text-negative'
                          : 'bg-surface-2 text-ink-faint'
                    }`}
                    title={`Projected balance ${compactRM(bal)}`}
                  >
                    {compactRM(bal).replace('RM', '')}
                    {isLow ? ' ☀️' : ''}
                  </span>
                )}
                <div className="mt-0.5 space-y-0.5">
                  {isPayday && (
                    <div
                      className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[9px] font-semibold leading-tight"
                      style={{ background: tint(PAYDAY_COLOR, 0.2) }}
                      title="Payday"
                    >
                      <span className="shrink-0">💰</span>
                      <span className="min-w-0 flex-1 truncate text-ink">Payday</span>
                    </div>
                  )}
                  {hols.length > 0 && (
                    <div
                      className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[9px] leading-tight"
                      style={{ background: tint(HOLIDAY_COLOR, 0.16) }}
                      title={hols.map((h) => h.name).join(' · ')}
                    >
                      <span className="shrink-0">🎉</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{hols[0].name}</span>
                    </div>
                  )}
                  {shown.map((e) => (
                    <Chip key={e.id} ev={e} />
                  ))}
                  {c.events.length > shown.length && (
                    <div className="px-1 text-[9px] font-medium text-ink-faint">+{c.events.length - shown.length} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
          <Stat label="In" value={<Money sen={summary.inSen} />} tone="positive" />
          <Stat label="Out" value={<Money sen={summary.outSen} />} tone="negative" />
          <Stat label="Net" value={<Money sen={summary.netSen} signed />} tone={summary.netSen < 0 ? 'negative' : 'positive'} />
        </div>
      </Card>

      {/* Selected-day detail */}
      <Card
        title={
          <span>
            {longDate(selectedISO, { weekday: 'long', day: 'numeric', month: 'long' })}
            {selectedISO === today && <span className="ml-2 text-gold">· Today</span>}
          </span>
        }
      >
        {selectedBal != null && (
          <p className="mb-3 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span className="text-ink-faint">Projected balance</span>
            <span className="font-semibold tabular-nums text-ink">{formatSen(selectedBal)}</span>
          </p>
        )}
        {selectedIsPayday && (
          <p
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{ background: tint(PAYDAY_COLOR, 0.18) }}
          >
            <span className="text-base leading-none">💰</span>
            <span className="font-medium text-ink">Payday</span>
            {payCfg.adjustForHolidays && (
              <span className="ml-auto text-xs text-ink-faint">adjusted for weekends/holidays</span>
            )}
          </p>
        )}
        {selectedHols.map((h) => (
          <p
            key={h.name}
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{ background: tint(HOLIDAY_COLOR, 0.14) }}
          >
            <span className="text-base leading-none">🎉</span>
            <span className="min-w-0 flex-1 font-medium text-ink">{h.name}</span>
            <span className="shrink-0 text-xs text-ink-faint">{h.national ? 'National' : 'State'} holiday</span>
          </p>
        ))}
        {selectedEvents.length === 0 ? (
          selectedHols.length === 0 && !selectedIsPayday ? (
            <p className="text-sm text-ink-faint">Nothing scheduled. Pick another day, or add an event below.</p>
          ) : null
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((e) => {
              const meta = EVENT_META[e.type];
              const inn = eventDirection(e.type) === 'in';
              return (
                <li key={e.id} className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg"
                    style={{ background: tint(meta.color, 0.18) }}
                  >
                    {eventEmoji(e)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{e.name || meta.label}</p>
                    <p className="text-xs text-ink-faint">{isFixedCostEvent(e.id) ? 'Fixed cost' : meta.label}</p>
                  </div>
                  <span className={`shrink-0 tabular-nums font-semibold ${inn ? 'text-positive' : 'text-ink'}`}>
                    {inn ? '+' : '−'}
                    {formatSen(e.amountSen)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {selectedEvents.length > 0 && (
          <p className="mt-3 flex items-center justify-between border-t border-line pt-2 text-sm">
            <span className="text-ink-faint">Day net</span>
            <span className={`font-semibold tabular-nums ${selectedNet < 0 ? 'text-negative' : 'text-positive'}`}>
              {formatSen(selectedNet, { signed: true })}
            </span>
          </p>
        )}
      </Card>

      {/* Public holidays + payday for the period */}
      {marks.length > 0 && (
        <Card title={view === 'month' ? 'Holidays & payday this month' : 'Holidays & payday this week'}>
          <ul className="space-y-2">
            {marks.map((m) => (
              <li key={m.dateISO} className="flex items-center gap-2 text-sm">
                <span className="shrink-0 text-base leading-none">{m.hols.length ? '🎉' : '💰'}</span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {[...(m.isPayday ? ['Payday'] : []), ...m.hols.map((h) => h.name)].join(' · ')}
                </span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {longDate(m.dateISO, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-ink-faint">
            {state ? '' : 'Set your state in Settings → Profile for state holidays and the right weekend. '}
            Public holidays are reminders — they don't move money.
          </p>
        </Card>
      )}

      {/* Full period list */}
      <Card title={view === 'month' ? 'Everything this month' : 'Everything this week'}>
        {list.length === 0 ? (
          <p className="text-sm text-ink-faint">No events in this {view}. Add your recurring money events below.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((d) => (
              <li key={d.dateISO}>
                <button
                  onClick={() => setSelectedISO(d.dateISO)}
                  className={`mb-1 flex w-full items-center gap-2 text-xs font-semibold ${
                    d.dateISO === selectedISO ? 'text-primary' : d.dateISO === today ? 'text-gold' : 'text-ink-soft'
                  }`}
                >
                  {longDate(d.dateISO, { weekday: 'short', day: 'numeric', month: 'short' })}
                  {d.dateISO === today ? ' · Today' : ''}
                </button>
                <ul className="space-y-1.5">
                  {d.events.map((e) => {
                    const meta = EVENT_META[e.type];
                    const inn = eventDirection(e.type) === 'in';
                    return (
                      <li key={e.id} className="flex items-center gap-2 text-sm">
                        <span className="shrink-0 text-base leading-none">{eventEmoji(e)}</span>
                        <span className="truncate text-ink">{e.name || meta.label}</span>
                        <span className="shrink-0 text-[10px] text-ink-faint">{isFixedCostEvent(e.id) ? 'Fixed' : meta.label}</span>
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

      {/* Manage */}
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
        {recurring.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Add subscriptions, your paycheck, savings/investment auto-deposits, BNPL instalments and
            card due dates to see them on the calendar. Names like “Netflix”, “Maxis” or “Rent” pick up
            an icon automatically.
          </p>
        ) : (
          <ul className="space-y-3">
            {recurring.map((ev) => {
              const patch = (fn: (a: RecurringEvent) => void) =>
                update((d) => {
                  const it = d.recurringEvents.find((x) => x.id === ev.id);
                  if (it) fn(it);
                });
              return (
                <li key={ev.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Emoji"
                      value={ev.emoji ?? ''}
                      placeholder={brandEmoji(ev.name, ev.type)}
                      maxLength={2}
                      onChange={(e) => patch((a) => void (a.emoji = e.target.value))}
                      className="h-10 w-11 shrink-0 rounded-lg border border-line bg-surface text-center text-lg outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                    <TextInput
                      aria-label="Event name"
                      placeholder="e.g. Netflix"
                      value={ev.name}
                      onChange={(e) => patch((a) => void (a.name = e.target.value))}
                    />
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
                      Type
                      <Select
                        className="mt-1"
                        aria-label="Type"
                        value={ev.type}
                        onChange={(e) => patch((a) => void (a.type = e.target.value as EventType))}
                      >
                        {TYPE_ORDER.map((t) => (
                          <option key={t} value={t}>
                            {EVENT_META[t].label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="text-xs text-ink-faint">
                      Amount
                      <div className="mt-1">
                        <MoneyInput valueSen={ev.amountSen} onChangeSen={(sen) => patch((a) => void (a.amountSen = sen))} />
                      </div>
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-faint">
                      Repeats
                      <Select className="mt-1" value={ev.freq} onChange={(e) => patch((a) => void (a.freq = e.target.value as EventFreq))}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                        <option value="once">One-off</option>
                      </Select>
                    </label>
                    <div>
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-ink-faint">
          Leave the emoji box blank to auto-detect from the name. Calendar items are reminders — they
          don't move money. Tracking only. Fixed monthly costs with a due day (set in{' '}
          <span className="font-semibold text-gold">Budget</span>) also show here.
        </p>
      </Card>
    </div>
  );
}
