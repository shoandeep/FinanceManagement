import { useId, useState, type MouseEvent } from 'react';
import { useTheme } from './theme';

/** A cartoon light bulb that "switches on" — drawn comic-style with burst rays. */
function BulbBurst() {
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-hidden="true">
      {/* burst rays */}
      <g
        className="animate-bulb-rays"
        stroke="#f6cf63"
        strokeWidth="2.4"
        strokeLinecap="round"
        style={{ transformOrigin: '16px 14px' }}
      >
        <line x1="16" y1="0.5" x2="16" y2="4.5" />
        <line x1="2.8" y1="3.6" x2="5.6" y2="6.4" />
        <line x1="29.2" y1="3.6" x2="26.4" y2="6.4" />
        <line x1="0.5" y1="14.5" x2="4.5" y2="14.5" />
        <line x1="31.5" y1="14.5" x2="27.5" y2="14.5" />
        <line x1="3.2" y1="25.5" x2="6.2" y2="23" />
        <line x1="28.8" y1="25.5" x2="25.8" y2="23" />
      </g>
      {/* soft glow */}
      <circle cx="16" cy="14" r="12" fill="#ffe06a" opacity="0.35" />
      {/* glass */}
      <circle cx="16" cy="14" r="9.5" fill="#ffe06a" stroke="#143029" strokeWidth="2.2" />
      {/* filament */}
      <path
        d="M12.3 15.6 l1.7-3.2 1.9 3.6 1.9-3.6 1.7 3.2"
        stroke="#e8932a"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* screw base */}
      <rect x="11.5" y="22.4" width="9" height="3.2" rx="1.2" fill="#d8cfbd" stroke="#143029" strokeWidth="1.5" />
      <path d="M12.6 26 h6.8 M13.4 28.4 h5.2" stroke="#143029" strokeWidth="1.5" strokeLinecap="round" />
      {/* shine */}
      <ellipse cx="12.4" cy="11" rx="1.8" ry="2.8" fill="#fffce8" opacity="0.85" transform="rotate(-20 12.4 11)" />
    </svg>
  );
}

/**
 * Animated theme toggle. The body is a disc with a moving circular "cutout"
 * (via an SVG mask): far away -> full sun, overlapping -> crescent moon. On hover
 * it previews the OTHER theme. Switching TO light fires a one-shot cartoon
 * light-bulb burst — for a beat it looks like the light is switched on from here.
 */
export function ThemeToggle({ size = 36 }: { size?: number }) {
  const { resolved, toggle } = useTheme();
  const [hover, setHover] = useState(false);
  const [burst, setBurst] = useState(0); // increments each dark->light to replay the burst
  const maskId = useId();

  const isDark = resolved === 'dark';
  // Hovering previews the theme you'd switch TO.
  const showMoon = hover ? !isDark : isDark;

  function handleToggle(e: MouseEvent<HTMLButtonElement>) {
    const switchingToLight = resolved === 'dark';
    const rect = e.currentTarget.getBoundingClientRect();
    // Reveal (and the bulb) originate from the centre of the button.
    toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    if (switchingToLight) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (!reduce) setBurst((n) => n + 1);
    }
  }

  // Cutout position: overlapping the body -> crescent; far off -> full disc.
  const cutout = showMoon ? { x: 5, y: -3.5 } : { x: 13, y: -12 };
  // Pewter-silk moon / molten-gold sun — on brand with the songket palette.
  const bodyColor = showMoon ? '#9fb4ad' : '#e8b23a';
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
        stroke="#e8b23a"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    );
  });

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative grid place-items-center rounded-full text-ink-faint transition hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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

      {/* One-shot "light on" burst (only when switching to light). */}
      {burst > 0 && (
        <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 z-50">
          <span
            className="animate-bulb-flash absolute left-1/2 top-1/2 h-20 w-20 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--gold-bright) / 0.95), hsl(var(--gold) / 0.45) 38%, transparent 70%)',
            }}
          />
          <span className="animate-bulb-pop absolute -top-10 left-1/2">
            <BulbBurst />
          </span>
        </span>
      )}
    </button>
  );
}
