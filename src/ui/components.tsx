import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { formatSen, senFromRinggit, type Sen } from '../money/money';

/* ----------------------------------------------------------------- Card */
export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- Stat */
type Tone = 'default' | 'positive' | 'negative' | 'muted';
const toneText: Record<Tone, string> = {
  default: 'text-slate-900 dark:text-slate-50',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  muted: 'text-slate-500 dark:text-slate-400',
};

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${toneText[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

/** Money helper that picks a tone automatically (negative -> red). */
export function Money({ sen, signed = false }: { sen: Sen; signed?: boolean }) {
  return <span className="tabular-nums">{formatSen(sen, { signed })}</span>;
}

/* ------------------------------------------------------------ ProgressBar */
export function ProgressBar({
  value,
  tone = 'indigo',
  label,
}: {
  value: number; // 0-100
  tone?: 'indigo' | 'emerald' | 'amber';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
    >
      <div className={`h-full rounded-full ${bar} transition-[width]`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* --------------------------------------------------------------- Button */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60 ${styles[variant]} ${className}`}
    />
  );
}

/* ---------------------------------------------------------------- Field */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

/* ------------------------------------------------------------ MoneyInput */
/**
 * RM input bound to integer sen. Shows a plain editable string; reformats to two
 * decimals on blur. Invalid input is rejected (the last valid sen value is kept)
 * and surfaced via aria-invalid.
 */
export function MoneyInput({
  valueSen,
  onChangeSen,
  id,
  allowNegative = false,
  ...rest
}: {
  valueSen: Sen;
  onChangeSen: (sen: Sen) => void;
  id?: string;
  allowNegative?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(() => formatSen(valueSen, { symbol: false }));
  const [invalid, setInvalid] = useState(false);

  // Sync when the underlying value changes externally (e.g., reset / load).
  useEffect(() => {
    setText(formatSen(valueSen, { symbol: false }));
    setInvalid(false);
  }, [valueSen]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        RM
      </span>
      <input
        {...rest}
        id={inputId}
        inputMode="decimal"
        aria-invalid={invalid}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw.trim() === '') {
            setInvalid(false);
            onChangeSen(0);
            return;
          }
          try {
            const sen = senFromRinggit(raw);
            if (!allowNegative && sen < 0) {
              setInvalid(true);
              return;
            }
            setInvalid(false);
            onChangeSen(sen);
          } catch {
            setInvalid(true);
          }
        }}
        onBlur={() => {
          if (!invalid) setText(formatSen(valueSen, { symbol: false }));
        }}
        className={`${inputCls} pl-9 text-right tabular-nums ${invalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------ Disclaimer */
export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      {children}
    </p>
  );
}
