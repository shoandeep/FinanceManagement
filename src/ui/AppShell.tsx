import { useState, type ReactNode } from 'react';
import { useVault } from '../state/VaultContext';
import { ThemeToggle } from './ThemeToggle';
import { Settings } from './Settings';
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

export function AppShell() {
  const { exit, goToAuth, session } = useVault();
  const [tab, setTab] = useState<TabId>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const screens: Record<TabId, ReactNode> = {
    home: <Dashboard onGoToPay={() => setTab('pay')} onGoToSpend={() => setTab('spend')} />,
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
            <ThemeToggle size={34} />
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="grid h-[34px] w-[34px] place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={exit}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {session === 'account' ? 'Lock' : 'Exit'}
            </button>
          </div>
        </div>
        {session === 'guest' && (
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-2 text-xs">
            <span className="text-amber-600 dark:text-amber-400">
              Guest mode — nothing is saved.
            </span>
            <button
              onClick={goToAuth}
              className="shrink-0 rounded-md bg-amber-500/15 px-2.5 py-1 font-medium text-amber-700 transition hover:bg-amber-500/25 dark:text-amber-300"
            >
              Save on this device
            </button>
          </div>
        )}
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
                  <span aria-hidden="true" className="text-base leading-none transition group-hover:scale-110">
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
