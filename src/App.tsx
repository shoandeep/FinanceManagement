import { VaultProvider, useVault } from './state/VaultContext';
import { ThemeProvider } from './ui/theme';
import { LockScreen } from './ui/LockScreen';
import { AppShell } from './ui/AppShell';

function Shell() {
  const { status, data } = useVault();

  if (status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950">
        <p>Loading…</p>
      </main>
    );
  }

  if (status !== 'unlocked' || !data) {
    return <LockScreen />;
  }

  return <AppShell />;
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
