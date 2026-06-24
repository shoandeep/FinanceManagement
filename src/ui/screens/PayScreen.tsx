import { useId } from 'react';
import { useVault } from '../../state/VaultContext';
import { deriveFinances } from '../../state/selectors';
import { todayISO } from '../../budget/dates';
import { formatSen, type Sen } from '../../money/money';
import type { DeductionLine } from '../../core/netpay';
import type { PayOverrides } from '../../core/netpay';
import { Card, Field, MoneyInput, Money, Select, Button, Disclaimer } from '../components';

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
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Estimate {formatSen(line.estimateSen)}
          {line.overridden && (
            <button
              type="button"
              className="ml-2 text-indigo-600 hover:underline dark:text-indigo-400"
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
          className={`w-16 shrink-0 text-center text-[10px] font-medium uppercase tracking-wide ${
            line.overridden ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
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

      <Card title="Deductions & net pay">
        <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">
          Each line is an estimate you can override with the actual figure from your payslip.
        </p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <OverrideRow label="EPF (employee)" line={f.pay.epf} field="epfEmployeeSen" />
          <OverrideRow label="SOCSO (employee)" line={f.pay.socso} field="socsoEmployeeSen" />
          <OverrideRow label="EIS (employee)" line={f.pay.eis} field="eisEmployeeSen" />
          <OverrideRow label="PCB (income tax)" line={f.pay.pcb} field="pcbMonthlySen" />
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Net pay</span>
            <span className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              <Money sen={f.pay.netSen} />
            </span>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
            <label className="text-xs text-slate-500 dark:text-slate-400">
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
                <span className="w-16 text-center text-[10px] uppercase tracking-wide text-slate-400">
                  Auto
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
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
