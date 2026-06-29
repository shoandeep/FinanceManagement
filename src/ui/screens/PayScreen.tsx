import { useId } from 'react';
import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO, parseISO, addDaysISO } from '../../budget/dates';
import { formatSen, type Sen } from '../../money/money';
import type { DeductionLine } from '../../core/netpay';
import type { PayOverrides } from '../../core/netpay';
import type { PayPeriodConfig, PayPeriodMode } from '../../model/types';
import { Card, Field, MoneyInput, Money, Select, Button, Disclaimer } from '../components';

const PAY_MODES: { id: PayPeriodMode; label: string }[] = [
  { id: 'calendarMonth', label: 'Calendar month' },
  { id: 'sameDay', label: 'Same day' },
  { id: 'custom', label: 'Custom dates' },
];
const pad2 = (n: number) => String(n).padStart(2, '0');
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
const monthLabel = (y: number, m: number) =>
  new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });

/** Pay-schedule config: choose how the budgeting period is defined. */
function PaySchedule() {
  const { data, update } = useVault();
  if (!data) return null;
  const cfg: PayPeriodConfig = data.payPeriod ?? { mode: 'calendarMonth', dayOfMonth: 25, customDates: {} };
  const f = deriveFinances(data, todayISO());
  const setCfg = (fn: (c: PayPeriodConfig) => void) =>
    update((d) => {
      if (!d.payPeriod) d.payPeriod = { mode: 'calendarMonth', dayOfMonth: 25, customDates: {} };
      fn(d.payPeriod);
    });

  const { year, month } = parseISO(todayISO());
  const months = [0, 1, 2].map((i) => {
    const dt = new Date(Date.UTC(year, month - 1 + i, 1));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
  });

  return (
    <Card title="Pay schedule">
      <p className="mb-3 text-xs text-ink-faint">
        Budget by calendar month, or by your pay cycle (payday → next payday) so the plan stretches
        when payday drifts.
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line">
        {PAY_MODES.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setCfg((c) => void (c.mode = opt.id))}
            aria-pressed={cfg.mode === opt.id}
            className={`rounded-lg px-1 py-1.5 text-xs font-semibold transition ${
              cfg.mode === opt.id ? 'bg-primary text-primary-contrast' : 'text-ink-faint hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {cfg.mode !== 'calendarMonth' && (
        <label className="mt-3 block text-xs text-ink-soft">
          Payday — day of month
          <input
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            value={cfg.dayOfMonth}
            aria-label="Payday day of month"
            onChange={(e) =>
              setCfg((c) => void (c.dayOfMonth = Math.max(1, Math.min(31, Number(e.target.value) || 1))))
            }
            className="mt-1 w-24 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm tabular-nums text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
          />
        </label>
      )}

      {cfg.mode === 'custom' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-ink-soft">Actual payday per month (overrides the day above)</p>
          {months.map(({ y, m }) => {
            const key = `${y}-${pad2(m)}`;
            return (
              <label key={key} className="flex items-center justify-between gap-2 text-xs text-ink-faint">
                <span className="shrink-0">{monthLabel(y, m)}</span>
                <input
                  type="date"
                  value={cfg.customDates[key] ?? ''}
                  aria-label={`Payday for ${monthLabel(y, m)}`}
                  onChange={(e) =>
                    setCfg((c) => {
                      if (e.target.value) c.customDates[key] = e.target.value;
                      else delete c.customDates[key];
                    })
                  }
                  className="rounded-lg border border-line-strong bg-surface-2 px-3 py-1.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30"
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-gold/15 bg-gold/[0.06] px-3 py-2 text-xs text-ink-soft">
        Current cycle:{' '}
        <strong className="text-gold">
          {shortDate(f.payPeriod.startISO)} – {shortDate(addDaysISO(f.payPeriod.endISO, -1))}
        </strong>{' '}
        · {f.payPeriod.daysInPeriod} days · {f.payPeriod.daysRemaining} left. Your monthly budget is
        spread across this cycle.
      </div>
    </Card>
  );
}

type OverrideField = keyof PayOverrides;

function OverrideRow({
  label,
  line,
  field,
}: {
  label: string;
  line: DeductionLine;
  field: OverrideField;
}) {
  const { update } = useVault();
  const id = useId();

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        <p className="text-xs text-ink-faint">
          Estimate {formatSen(line.estimateSen)}
          {line.overridden && (
            <button
              type="button"
              className="ml-2 font-semibold text-gold hover:underline"
              onClick={() =>
                update((d) => {
                  delete d.pay.overrides[field];
                })
              }
            >
              reset to estimate
            </button>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-32">
          <MoneyInput
            id={id}
            valueSen={line.amountSen}
            onChangeSen={(sen) =>
              update((d) => {
                d.pay.overrides[field] = sen;
              })
            }
          />
        </div>
        <span
          className={`w-16 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wide ${
            line.overridden ? 'text-gold' : 'text-ink-faint'
          }`}
        >
          {line.overridden ? 'Override' : 'Auto'}
        </span>
      </div>
    </div>
  );
}

export function PayScreen() {
  const { data, update } = useVault();
  const grossId = useId();
  const ageId = useId();
  const resId = useId();
  const reliefId = useId();
  if (!data) return null;
  const f = deriveFinances(data, todayISO());

  const setGross = (sen: Sen) => update((d) => void (d.pay.grossSen = sen));

  return (
    <div className="space-y-4">
      <Card title="Your pay">
        <div className="space-y-3">
          <Field label="Gross monthly pay" htmlFor={grossId}>
            <MoneyInput id={grossId} valueSen={data.pay.grossSen} onChangeSen={setGross} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age band" htmlFor={ageId}>
              <Select
                id={ageId}
                value={data.pay.age}
                onChange={(e) => update((d) => void (d.pay.age = e.target.value as typeof d.pay.age))}
              >
                <option value="under60">Under 60</option>
                <option value="age60plus">60 and above</option>
              </Select>
            </Field>
            <Field label="Residency" htmlFor={resId}>
              <Select
                id={resId}
                value={data.pay.residency}
                onChange={(e) =>
                  update((d) => void (d.pay.residency = e.target.value as typeof d.pay.residency))
                }
              >
                <option value="citizen">Malaysian citizen</option>
                <option value="pr">Permanent resident</option>
                <option value="foreigner">Foreigner</option>
              </Select>
            </Field>
          </div>
          <Field
            label="Extra annual tax reliefs"
            htmlFor={reliefId}
            hint="Beyond the automatic RM9,000 personal + EPF relief (e.g. lifestyle, medical)."
          >
            <MoneyInput
              id={reliefId}
              valueSen={data.pay.extraReliefsSen}
              onChangeSen={(sen) => update((d) => void (d.pay.extraReliefsSen = sen))}
            />
          </Field>
        </div>
      </Card>

      <PaySchedule />

      <Card title="Deductions & net pay">
        <p className="mb-1 text-xs text-ink-faint">
          Each line is an estimate you can override with the actual figure from your payslip.
        </p>
        <div className="divide-y divide-line">
          <OverrideRow label="EPF (employee)" line={f.pay.epf} field="epfEmployeeSen" />
          <OverrideRow label="SOCSO (employee)" line={f.pay.socso} field="socsoEmployeeSen" />
          <OverrideRow label="EIS (employee)" line={f.pay.eis} field="eisEmployeeSen" />
          <OverrideRow label="PCB (income tax)" line={f.pay.pcb} field="pcbMonthlySen" />
        </div>

        <div className="mt-3 rounded-xl border border-gold/20 bg-gold/[0.07] p-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-ink">Net pay</span>
            <span className="text-xl font-bold tabular-nums text-positive">
              <Money sen={f.pay.netSen} />
            </span>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
            <label className="text-xs text-ink-soft">
              Override net pay with payslip figure
            </label>
            <div className="flex items-center gap-2">
              <div className="w-32">
                <MoneyInput
                  valueSen={f.pay.netSen}
                  onChangeSen={(sen) => update((d) => void (d.pay.overrides.netSen = sen))}
                />
              </div>
              {f.pay.netOverridden ? (
                <Button
                  variant="ghost"
                  className="w-16 px-1 text-[10px]"
                  onClick={() => update((d) => void delete d.pay.overrides.netSen)}
                >
                  reset
                </Button>
              ) : (
                <span className="w-16 text-center text-[10px] uppercase tracking-wide text-ink-faint">
                  Auto
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-ink-faint">
          Employer contributions (info only): EPF {formatSen(f.pay.epf.employerSen)} · SOCSO{' '}
          {formatSen(f.pay.socso.employerSen)} · EIS {formatSen(f.pay.eis.employerSen)}
        </p>
      </Card>

      <Disclaimer>
        EPF below RM20,000 uses a labelled flat-11% approximation; PCB is a simplified MTD estimate.
        Your payslip is the source of truth — override any line above.
      </Disclaimer>
    </div>
  );
}
