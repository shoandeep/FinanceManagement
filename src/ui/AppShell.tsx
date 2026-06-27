import { useState, type ReactNode } from 'react';
import { useVault } from '../state/VaultContext';
import { ThemeToggle } from './ThemeToggle';
import { Settings } from './Settings';
import { Dashboard } from './screens/Dashboard';
import { PayScreen } from './screens/PayScreen';
import { CostsScreen } from './screens/CostsScreen';
import { SavingsScreen } from './screens/SavingsScreen';
import { SpendScreen } from './screens/SpendScreen';
import { CalendarScreen } from './screens/CalendarScreen';

type TabId = 'home' | 'pay' | 'costs' | 'save' | 'spend' | 'calendar';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '◎' },
  { id: 'pay', label: 'Pay', icon: '₪' },
  { id: 'costs', label: 'Budget', icon: '▤' },
  { id: 'save', label: 'Save', icon: '◆' },
  { id: 'spend', label: 'Spend', icon: '◷' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
];

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function AppShell() {
  const { exit, goToAuth, session } = useVault();
  const [tab, setTab] = useState<TabId>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wide = tab === 'home';

  const screens: Record<TabId, ReactNode> = {
    home: (
      <Dashboard
        onGoToPay={() => setTab('pay')}
        onGoToSpend={() => setTab('spend')}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    ),
    pay: <PayScreen />,
    costs: <CostsScreen />,
    save: <SavingsScreen />,
    spend: <SpendScreen />,
    calendar: <CalendarScreen />,
  };

  return (
    <div className="weave-bg relative min-h-dvh text-ink lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-line lg:bg-surface/70 lg:px-3 lg:py-5 lg:backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-contrast shadow-[0_0_0_1px_hsl(var(--gold)/0.4)]">
            FG
          </span>
          <span className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
            Finance Guru
          </span>
        </div>
        <nav aria-label="Sections" className="mt-7 flex flex-1 flex-col gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-ink-faint hover:bg-gold/8 hover:text-ink'
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`text-base leading-none transition group-hover:scale-110 ${active ? 'text-gold' : ''}`}
                >
                  {t.icon}
                </span>
                {t.label}
              </button>
            );
          })}
        </nav>
        {session === 'guest' && (
          <div className="mb-3 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs text-ink-soft">
            Guest mode — nothing is saved.
            <button onClick={goToAuth} className="mt-1 block font-semibold text-gold underline">
              Save on this device
            </button>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <ThemeToggle size={34} />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="grid h-[34px] w-[34px] place-items-center rounded-full text-ink-faint transition hover:bg-gold/10 hover:text-gold"
          >
            <GearIcon />
          </button>
          <button
            onClick={exit}
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-faint transition hover:bg-gold/10 hover:text-ink"
          >
            {session === 'account' ? 'Lock' : 'Exit'}
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="w-full lg:pl-60">
        {/* Mobile header (unchanged on mobile; hidden on desktop) */}
        <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <h1 className="flex items-center gap-2 font-display text-[1.05rem] font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-[0.7rem] font-bold text-primary-contrast">
                FG
              </span>
              Finance Guru
            </h1>
            <div className="flex items-center gap-1">
              <ThemeToggle size={34} />
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                className="grid h-[34px] w-[34px] place-items-center rounded-full text-ink-faint transition hover:bg-gold/10 hover:text-gold"
              >
                <GearIcon />
              </button>
              <button
                onClick={exit}
                className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-faint transition hover:bg-gold/10 hover:text-ink"
              >
                {session === 'account' ? 'Lock' : 'Exit'}
              </button>
            </div>
          </div>
          {session === 'guest' && (
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-2 text-xs">
              <span className="text-gold">Guest mode — nothing is saved.</span>
              <button
                onClick={goToAuth}
                className="shrink-0 rounded-md border border-gold/30 bg-gold/15 px-2.5 py-1 font-semibold text-gold transition hover:bg-gold/25"
              >
                Save on this device
              </button>
            </div>
          )}
        </header>

        {/* Desktop page heading */}
        <div className="hidden lg:block">
          <div className={`mx-auto px-6 pt-8 ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
            <h2 className="font-display text-2xl font-semibold capitalize tracking-tight text-ink">
              {TABS.find((t) => t.id === tab)!.label}
            </h2>
            <div aria-hidden className="mt-2 h-px w-16 bg-gradient-to-r from-gold to-transparent" />
          </div>
        </div>

        <main className={`mx-auto max-w-lg px-4 pb-28 pt-4 lg:px-6 lg:pb-12 lg:pt-4 ${wide ? 'lg:max-w-5xl' : 'lg:max-w-2xl'}`}>
          {screens[tab]}
        </main>

        {/* Mobile bottom nav (unchanged on mobile; hidden on desktop) */}
        <nav
          aria-label="Sections"
          className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden"
        >
          <ul className="mx-auto flex max-w-lg">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <li key={t.id} className="flex-1">
                  <button
                    onClick={() => setTab(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                      active ? 'text-primary' : 'text-ink-faint hover:text-ink'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute top-0 h-0.5 w-8 rounded-full bg-gold"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`text-base leading-none ${active ? 'text-gold' : ''}`}
                    >
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

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
