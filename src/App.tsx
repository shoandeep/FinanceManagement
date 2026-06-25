import { VaultProvider, useVault } from './state/VaultContext';
import { ThemeProvider } from './ui/theme';
import { Landing } from './ui/Landing';
import { LockScreen } from './ui/LockScreen';
import { AppShell } from './ui/AppShell';

function Shell() {
  const { view, data } = useVault();

  if (view === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950">
        <p>Loading…</p>
      </main>
    );
  }
  if (view === 'landing') return <Landing />;
  if (view === 'auth') return <LockScreen />;
  if (data) return <AppShell />;
  return <Landing />;
}

export default function App() {
  return (
    <ThemeProvider>
      <VaultProvider>
        <Shell />
      </VaultProvider>
    </ThemeProvider>
  );
}
