import { useId, useState } from 'react';
import { useTheme } from './theme';

/**
 * Animated theme toggle. The body is a disc with a moving circular "cutout"
 * (via an SVG mask): far away -> full sun, overlapping -> crescent moon. On hover
 * it previews the OTHER theme, so the sun appears to hide behind the moon (and
 * vice-versa) before you even click.
 */
export function ThemeToggle({ size = 36 }: { size?: number }) {
  const { resolved, toggle } = useTheme();
  const [hover, setHover] = useState(false);
  const maskId = useId();

  const isDark = resolved === 'dark';
  // Hovering previews the theme you'd switch TO.
  const showMoon = hover ? !isDark : isDark;

  // Cutout position: overlapping the body -> crescent; far off -> full disc.
  const cutout = showMoon ? { x: 5, y: -3.5 } : { x: 13, y: -12 };
  const bodyColor = showMoon ? '#cbd5e1' : '#fbbf24'; // slate-300 moon / amber-400 sun
  const transition = 'transform 500ms cubic-bezier(.34,1.56,.64,1), opacity 350ms ease';

  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const r1 = 8.8;
    const r2 = 11.2;
    return (
      <line
        key={i}
        x1={12 + Math.cos(a) * r1}
        y1={12 + Math.sin(a) * r1}
        x2={12 + Math.cos(a) * r2}
        y2={12 + Math.sin(a) * r2}
        stroke="#fbbf24"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    );
  });

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="grid place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:hover:bg-slate-800"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" aria-hidden="true">
        <g
          style={{
            opacity: showMoon ? 0 : 1,
            transform: showMoon ? 'rotate(-40deg) scale(.6)' : 'rotate(0deg) scale(1)',
            transformOrigin: '12px 12px',
            transition,
          }}
        >
          {rays}
        </g>
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <circle
            cx="12"
            cy="12"
            r="6.2"
            fill="black"
            style={{
              transform: `translate(${cutout.x}px, ${cutout.y}px)`,
              transformOrigin: '12px 12px',
              transition,
            }}
          />
        </mask>
        <circle
          cx="12"
          cy="12"
          r="6"
          mask={`url(#${maskId})`}
          style={{ fill: bodyColor, transition: 'fill 350ms ease' }}
        />
      </svg>
    </button>
  );
}
