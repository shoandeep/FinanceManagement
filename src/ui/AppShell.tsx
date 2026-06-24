import { useState, type ReactNode } from 'react';
import { useVault } from '../state/VaultContext';
import { useTheme } from './theme';
import { Dashboard } from './screens/Dashboard';
import { PayScreen } from './screens/PayScreen';
import { CostsScreen } from './screens/CostsScreen';
import { SavingsScreen } from './screens/SavingsScreen';
import { SpendScreen } from './screens/SpendScreen';

type TabId = 'home' | 'pay' | 'costs' | 'save' | 'spend';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '◎' },
  { id: 'pay', label: 'Pay', icon: '₪' },
  { id: 'costs', label: 'Budget', icon: '▤' },
  { id: 'save', label: 'Save', icon: '◆' },
  { id: 'spend', label: 'Spend', icon: '◷' },
];

function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {resolved === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

export function AppShell() {
  const { lock } = useVault();
  const [tab, setTab] = useState<TabId>('home');

  const screens: Record<TabId, ReactNode> = {
    home: <Dashboard onGoToPay={() => setTab('pay')} />,
    pay: <PayScreen />,
    costs: <CostsScreen />,
    save: <SavingsScreen />,
    spend: <SpendScreen />,
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold tracking-tight">Finance Guru</h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={lock}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">{screens[tab]}</main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <li key={t.id} className="flex-1">
                <button
                  onClick={() => setTab(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
