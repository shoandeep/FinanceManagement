import { useState } from 'react';
import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { newId } from '../../model/defaults';
import { transfersFor, applyTransferEffect } from '../../budget/transfers';
import { formatSen } from '../../money/money';
import { cashSummary } from '../../budget/cash';
import type { CashAccountType, TransferKind } from '../../model/types';
import { Card, Money, MoneyInput, TextInput, Select, Button, ProgressBar, Stat, Disclaimer, Toggle } from '../components';

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Compact, collapsible history of logged transfers into a tracker. Each row
 * shows date + amount; expand to see/edit the note & source account, or delete.
 * Edits delta-adjust the tracker balance; delete reverses the transfer.
 */
function TransferLog({ kind, targetId }: { kind: TransferKind; targetId: string }) {
  const { data, update } = useVault();
  const [openId, setOpenId] = useState<string | null>(null);
  if (!data) return null;
  const items = transfersFor(data.transfers, kind, targetId);
  if (items.length === 0) return null;
  const accounts = data.cashAccounts ?? [];

  const patch = (id: string, fn: (t: (typeof items)[number]) => void) =>
    update((d) => {
      const t = d.transfers.find((x) => x.id === id);
      if (t) fn(t);
    });
  const setAmount = (id: string, sen: number) =>
    update((d) => {
      const t = d.transfers.find((x) => x.id === id);
      if (!t) return;
      applyTransferEffect(d, t, -1);
      t.amountSen = sen;
      applyTransferEffect(d, t, 1);
    });
  const remove = (id: string) =>
    update((d) => {
      const t = d.transfers.find((x) => x.id === id);
      if (!t) return;
      applyTransferEffect(d, t, -1);
      d.transfers = d.transfers.filter((x) => x.id !== id);
    });

  return (
    <div className="mt-3 border-t border-line pt-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        Transfers ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((t) => {
          const open = openId === t.id;
          const acc = accounts.find((a) => a.id === t.accountId);
          return (
            <li key={t.id} className="rounded-lg bg-surface-2/50">
              <button
                onClick={() => setOpenId(open ? null : t.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
              >
                <span className="text-ink-faint">{shortDate(t.dateISO)}</span>
                {acc && <span className="truncate text-ink-faint">· {acc.name}</span>}
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-positive">+{formatSen(t.amountSen)}</span>
                <span aria-hidden className="shrink-0 text-ink-faint">{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <div className="space-y-2 px-2 pb-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-ink-faint">
                      Amount
                      <div className="mt-1">
                        <MoneyInput valueSen={t.amountSen} onChangeSen={(sen) => setAmount(t.id, sen)} />
                      </div>
                    </label>
                    <label className="text-[11px] text-ink-faint">
                      Date
                      <input
                        type="date"
                        value={t.dateISO}
                        aria-label="Transfer date"
                        onChange={(e) => e.target.value && patch(t.id, (x) => void (x.dateISO = e.target.value))}
                        className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                      />
                    </label>
                  </div>
                  {accounts.length > 0 && (
                    <label className="block text-[11px] text-ink-faint">
                      From account
                      <Select
                        className="mt-1"
                        aria-label="From account"
                        value={t.accountId ?? ''}
                        onChange={(e) =>
                          patch(t.id, (x) => {
                            if (e.target.value) x.accountId = e.target.value;
                            else delete x.accountId;
                          })
                        }
                      >
                        <option value="">—</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}
                  <label className="block text-[11px] text-ink-faint">
                    Note
                    <TextInput
                      className="mt-1"
                      placeholder="Optional"
                      value={t.note ?? ''}
                      onChange={(e) =>
                        patch(t.id, (x) => {
                          if (e.target.value) x.note = e.target.value;
                          else delete x.note;
                        })
                      }
                    />
                  </label>
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    aria-label="Delete transfer"
                    onClick={() => remove(t.id)}
                  >
                    Delete entry
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ACCOUNT_TYPES: { id: CashAccountType; label: string }[] = [
  { id: 'bank', label: 'Bank' },
  { id: 'ewallet', label: 'E-wallet' },
  { id: 'fd', label: 'Fixed deposit' },
];

const rateInputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-right text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

function RatePct({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
}) {
  return (
    <label className="text-xs text-ink-faint">
      {label}
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={value ?? ''}
          placeholder="0"
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? undefined : Math.max(0, Math.min(100, Number(v) || 0)));
          }}
          className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-right text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
        <span className="text-sm text-ink-faint">%</span>
      </div>
    </label>
  );
}

/** Advanced view: where idle (non-investment) cash rests + its potential earnings. */
function CashSavings({ today }: { today: string }) {
  const { data, update } = useVault();
  if (!data) return null;
  const sum = cashSummary(data.cashAccounts, today);
  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

  return (
    <Card
      title="Where your cash rests"
      className="kain-edge"
      action={
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          onClick={() =>
            update((d) =>
              d.cashAccounts.push({ id: newId(), name: '', type: 'bank', balanceSen: 0, ratePercent: 0 }),
            )
          }
        >
          + Add
        </Button>
      }
    >
      {data.cashAccounts.length === 0 ? (
        <p className="text-sm text-ink-faint">
          Add your banks, e-wallets and fixed deposits with their rates to see how much your idle cash
          could earn — and spot the best place to park it.
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Stat label="Resting" value={<Money sen={sum.totalBalanceSen} />} />
            <Stat
              label="Potential / yr"
              value={<Money sen={sum.totalAnnualEarningsSen} />}
              tone="positive"
              sub={`${formatSen(sum.totalMonthlyEarningsSen)}/mo`}
            />
            <Stat label="Blended rate" value={`${sum.blendedRatePercent.toFixed(2)}%`} tone="muted" />
          </div>
          <ul className="space-y-3">
            {data.cashAccounts.map((acc, i) => {
              const s = sum.accounts[i];
              const patch = (fn: (a: typeof acc) => void) =>
                update((d) => {
                  const it = d.cashAccounts.find((x) => x.id === acc.id);
                  if (it) fn(it);
                });
              return (
                <li key={acc.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Account name"
                      placeholder="e.g. RYT Bank"
                      value={acc.name}
                      onChange={(e) => patch((a) => (a.name = e.target.value))}
                    />
                    <Select
                      aria-label="Type"
                      className="w-32"
                      value={acc.type}
                      onChange={(e) => patch((a) => (a.type = e.target.value as CashAccountType))}
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="danger"
                      className="px-2"
                      aria-label={`Remove ${acc.name || 'account'}`}
                      onClick={() => update((d) => void (d.cashAccounts = d.cashAccounts.filter((x) => x.id !== acc.id)))}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-faint">
                      Balance
                      <div className="mt-1">
                        <MoneyInput valueSen={acc.balanceSen} onChangeSen={(sen) => patch((a) => (a.balanceSen = sen))} />
                      </div>
                    </label>
                    <RatePct
                      label="Base rate (p.a.)"
                      value={acc.ratePercent}
                      onChange={(n) => patch((a) => (a.ratePercent = n ?? 0))}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <RatePct
                      label="Promo rate (optional)"
                      value={acc.promoRatePercent}
                      onChange={(n) =>
                        patch((a) => {
                          if (n == null) delete a.promoRatePercent;
                          else a.promoRatePercent = n;
                        })
                      }
                    />
                    <label className="text-xs text-ink-faint">
                      Promo until
                      <input
                        type="date"
                        value={acc.promoEnds ?? ''}
                        aria-label="Promo end date"
                        onChange={(e) =>
                          patch((a) => {
                            if (e.target.value) a.promoEnds = e.target.value;
                            else delete a.promoEnds;
                          })
                        }
                        className={rateInputCls + ' text-left'}
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`rounded-md px-2 py-0.5 font-semibold ${
                        s.promoActive ? 'bg-gold/15 text-gold' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {s.effectiveRatePercent.toFixed(2)}%
                      {s.promoActive ? ` promo${acc.promoEnds ? ` · until ${fmtDate(acc.promoEnds)}` : ''}` : ''}
                    </span>
                    <span className="tabular-nums text-ink-soft">
                      ≈ {formatSen(s.annualEarningsSen)}/yr · {formatSen(s.monthlyEarningsSen)}/mo
                    </span>
                  </div>
                  {s.promoActive && (
                    <p className="mt-1 text-[11px] text-ink-faint">
                      Reverts to base {s.baseRatePercent.toFixed(2)}% after the promo ends.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-ink-faint">
            Potential earnings are simple estimates (balance × rate ÷ year). Actual interest depends on
            each provider's terms, tiers and compounding — not advice.
          </p>
        </>
      )}
    </Card>
  );
}

export function SavingsScreen() {
  const { data, update } = useVault();
  if (!data) return null;
  const today = todayISO();
  const f = deriveFinances(data, today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Advanced</p>
          <p className="text-xs text-ink-faint">
            Track where idle cash rests (banks, e-wallets, fixed deposits) and its potential earnings.
          </p>
        </div>
        <Toggle
          checked={data.advancedSave}
          onChange={(next) => update((d) => void (d.advancedSave = next))}
          label="Toggle advanced cash tracking"
        />
      </div>

      {data.advancedSave && <CashSavings today={today} />}

      <Card title="Emergency fund">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-ink-soft">Months to cover</span>
            <input
              type="number"
              min={0}
              max={36}
              value={data.emergencyFund.months}
              onChange={(e) =>
                update((d) => void (d.emergencyFund.months = Math.max(0, Number(e.target.value) || 0)))
              }
              className="mt-1 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm tabular-nums text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Current balance</span>
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
          <p className="mt-2 text-xs text-ink-soft">
            Suggested: route {formatSen(f.emergency.suggestedContributionSen)} of this month's savings
            here first.
          </p>
        )}
        <TransferLog kind="emergency" targetId="" />
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
          <p className="text-sm text-ink-faint">No goals yet.</p>
        ) : (
          <ul className="space-y-4">
            {data.goals.map((g, i) => {
              const s = f.goals[i];
              return (
                <li key={g.id} className="rounded-xl border border-line bg-surface-2/40 p-3">
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
                        update((d) => {
                          d.goals = d.goals.filter((x) => x.id !== g.id);
                          d.transfers = d.transfers.filter((x) => !(x.kind === 'savings' && x.targetId === g.id));
                        })
                      }
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-soft">
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
                    <label className="text-xs text-ink-soft">
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
                  <label className="mt-2 block text-xs text-ink-soft">
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
                      className="mt-1 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
                    />
                  </label>
                  <div className="mt-2">
                    <ProgressBar value={s.pctComplete} label={`${g.name} progress`} />
                    <p className="mt-1 flex justify-between text-xs text-ink-faint">
                      <span>{s.pctComplete.toFixed(0)}% · {formatSen(s.remainingSen)} to go</span>
                      {s.suggestedMonthlySen !== null && (
                        <span className={s.overdue ? 'text-negative' : ''}>
                          {s.overdue ? 'Overdue · ' : ''}
                          {formatSen(s.suggestedMonthlySen)}/mo
                        </span>
                      )}
                    </p>
                  </div>
                  <TransferLog kind="savings" targetId={g.id} />
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
          <p className="text-sm text-ink-faint">
            Track pots like ASB, EPF i-Invest, unit trusts, equities. Tracking only — not advice.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.investments.map((inv) => (
              <li key={inv.id}>
                <div className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
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
                      update((d) => {
                        d.investments = d.investments.filter((x) => x.id !== inv.id);
                        d.transfers = d.transfers.filter((x) => !(x.kind === 'investment' && x.targetId === inv.id));
                      })
                    }
                  >
                    ✕
                  </Button>
                </div>
                <TransferLog kind="investment" targetId={inv.id} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="font-medium text-ink-soft">Total invested</span>
          <span className="font-bold tabular-nums text-ink">
            <Money sen={f.investmentsTotalSen} />
          </span>
        </div>
      </Card>

      <Disclaimer>Tracking only — not investment advice.</Disclaimer>
    </div>
  );
}
