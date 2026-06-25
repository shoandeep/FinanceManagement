import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type Resolved = 'light' | 'dark';

const STORAGE_KEY = 'fg.theme'; // non-sensitive UI preference only

/** Optional origin (the toggle's centre) for the circular reveal. */
export interface ToggleOrigin {
  x: number;
  y: number;
}

interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: Resolved;
  setChoice: (c: ThemeChoice) => void;
  toggle: (origin?: ToggleOrigin) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStored);
  const [resolved, setResolved] = useState<Resolved>(() =>
    readStored() === 'dark' || (readStored() === 'system' && systemPrefersDark()) ? 'dark' : 'light',
  );
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  // Apply the resolved class. For an explicit choice we set it directly so it can
  // happen synchronously inside a View Transition; `system` is handled reactively.
  useEffect(() => {
    if (choice === 'system') {
      const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        const isDark = mq.matches;
        setResolved(isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDark);
      };
      apply();
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    const isDark = choice === 'dark';
    setResolved(isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
    return undefined;
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  /** Synchronously commit a theme (class + state) — used inside the transition. */
  const applyNow = useCallback(
    (next: Resolved) => {
      flushSync(() => {
        document.documentElement.classList.toggle('dark', next === 'dark');
        setResolved(next);
        setChoice(next);
      });
    },
    [setChoice],
  );

  const toggle = useCallback(
    (origin?: ToggleOrigin) => {
      const next: Resolved = resolvedRef.current === 'dark' ? 'light' : 'dark';

      const canVT =
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        !!origin &&
        !prefersReducedMotion();

      if (!canVT) {
        document.documentElement.classList.toggle('dark', next === 'dark');
        setResolved(next);
        setChoice(next);
        return;
      }

      // Light "spreads" out from the button: a clip-path circle grows from here.
      const { x, y } = origin;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const root = document.documentElement;
      root.style.setProperty('--vt-x', `${x}px`);
      root.style.setProperty('--vt-y', `${y}px`);
      root.style.setProperty('--vt-r', `${Math.ceil(r)}px`);
      root.dataset.vtTo = next; // for any direction-specific styling

      (document as Document & {
        startViewTransition: (cb: () => void) => unknown;
      }).startViewTransition(() => applyNow(next));
    },
    [applyNow, setChoice],
  );

  return (
    <ThemeContext.Provider value={{ choice, resolved, setChoice, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
