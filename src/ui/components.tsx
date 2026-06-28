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
      className={`silk-panel kain-edge rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="font-display text-[0.95rem] font-medium tracking-tight text-ink">
              {title}
            </h2>
          )}
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
  default: 'text-ink',
  positive: 'text-positive',
  negative: 'text-negative',
  muted: 'text-ink-faint',
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
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums tracking-tight ${toneText[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
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
  // 'indigo' is the legacy default tone name kept for the call-sites; it now
  // renders the primary jungle-teal → gold weave.
  const bar = {
    indigo: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--gold)))',
    emerald: 'linear-gradient(90deg, hsl(var(--positive)), hsl(var(--primary-soft)))',
    amber: 'linear-gradient(90deg, hsl(var(--warning)), hsl(var(--gold-bright)))',
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: bar }}
      />
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
    primary:
      'bg-primary text-primary-contrast shadow-sm hover:brightness-110 hover:-translate-y-px active:translate-y-0',
    secondary:
      'border border-line-strong bg-surface text-ink hover:border-gold/50 hover:bg-surface-2',
    ghost: 'text-ink-soft hover:bg-gold/10 hover:text-gold',
    danger: 'text-negative hover:bg-negative/10',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50 ${styles[variant]} ${className}`}
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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : (
        hint && <p className="text-xs text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30 placeholder:text-ink-faint';

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
  // Empty (not "0.00") when zero, so the placeholder shows and typing starts fresh.
  const fmt = (sen: Sen) => (sen ? formatSen(sen, { symbol: false }) : '');
  const [text, setText] = useState(() => fmt(valueSen));
  const [invalid, setInvalid] = useState(false);
  const [focused, setFocused] = useState(false);

  // Sync from props only when NOT being edited — otherwise the user's own
  // keystrokes get reformatted mid-typing (e.g. "5" -> "5.00") and the caret jumps.
  useEffect(() => {
    if (!focused) {
      setText(fmt(valueSen));
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueSen, focused]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-gold">
        RM
      </span>
      <input
        {...rest}
        id={inputId}
        inputMode="decimal"
        placeholder="0.00"
        aria-invalid={invalid}
        value={text}
        onFocus={() => setFocused(true)}
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
          setFocused(false);
          if (!invalid) setText(fmt(valueSen));
        }}
        className={`${inputCls} pl-9 text-right tabular-nums ${invalid ? 'border-negative focus:border-negative focus:ring-negative/30' : ''}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------ Disclaimer */
export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-gold/25 bg-gold/10 px-3 py-2 text-xs leading-relaxed text-ink-soft">
      {children}
    </p>
  );
}
