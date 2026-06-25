import { formatSen, type Sen } from '../money/money';

/** On-brand jewel-tone palette for category segments (cycles if needed). */
export const CHART_COLORS = [
  '#caa23a', // gold
  '#1f9e88', // jade
  '#b94a5a', // garnet rose
  '#e0973a', // amber
  '#8e6fae', // plum
  '#7d9b3f', // olive
  '#3a8f9b', // teal-blue
  '#d4b94f', // pale gold
];

/** Donut of spending by category (month to date) + a compact legend. */
export function CategoryDonut({ items }: { items: { name: string; value: Sen }[] }) {
  const segs = items.filter((i) => i.value > 0);
  const total = segs.reduce((s, i) => s + i.value, 0);
  if (total <= 0) {
    return <p className="text-sm text-ink-faint">No spending logged this month yet.</p>;
  }
  const size = 150;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0" role="img" aria-label="Spending by category">
        <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="hsl(var(--line))" strokeWidth={stroke} />
          {segs.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * C;
            const off = -acc * C;
            acc += frac;
            return (
              <circle
                key={i}
                r={r}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={off}
              />
            );
          })}
        </g>
        <text x={size / 2} y={size / 2 - 3} textAnchor="middle" className="fill-ink font-mono" fontSize="14" fontWeight="700">
          {formatSen(total)}
        </text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-ink-faint" fontSize="9">
          this month
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segs.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="truncate text-ink-soft">{s.name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-ink-faint">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Daily spending bars for the current month, with the average-budget reference line. */
export function DailyBars({
  days,
  refValue,
}: {
  days: { day: number; value: Sen; today: boolean }[];
  refValue: Sen;
}) {
  const W = 320;
  const H = 116;
  const padX = 6;
  const padTop = 10;
  const padBottom = 16;
  const innerH = H - padTop - padBottom;
  const top = Math.max(refValue, ...days.map((d) => d.value), 1);
  const bw = (W - padX * 2) / days.length;
  const refY = H - padBottom - (refValue / top) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily spending this month">
      {/* average daily budget reference */}
      {refValue > 0 && (
        <>
          <line x1={padX} x2={W - padX} y1={refY} y2={refY} stroke="hsl(var(--gold))" strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
          <text x={W - padX} y={refY - 3} textAnchor="end" className="fill-gold font-mono" fontSize="8">
            avg {formatSen(refValue, { symbol: false })}
          </text>
        </>
      )}
      {days.map((d, i) => {
        const h = (d.value / top) * innerH;
        const x = padX + i * bw;
        return (
          <rect
            key={i}
            x={x + bw * 0.16}
            y={H - padBottom - h}
            width={bw * 0.68}
            height={Math.max(h, 0)}
            rx="1"
            fill={d.today ? 'hsl(var(--gold))' : 'hsl(var(--primary))'}
            opacity={d.value > 0 ? (d.today ? 1 : 0.85) : 0.18}
          />
        );
      })}
      {/* sparse day labels */}
      {days.map((d, i) =>
        d.day === 1 || d.day % 5 === 0 || d.today ? (
          <text
            key={`l${i}`}
            x={padX + i * bw + bw / 2}
            y={H - 4}
            textAnchor="middle"
            className={d.today ? 'fill-gold' : 'fill-ink-faint'}
            fontSize="7.5"
          >
            {d.day}
          </text>
        ) : null,
      )}
    </svg>
  );
}
