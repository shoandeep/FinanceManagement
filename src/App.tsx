import { VaultProvider, useVault } from './state/VaultContext';
import { LockScreen } from './ui/LockScreen';

function Shell() {
  const { status, data, lock } = useVault();

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

  // Phase 3 placeholder — the full dashboard + input screens land in Phase 5.
  return (
    <main className="min-h-dvh bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Finance Guru</h1>
          <button onClick={lock} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Lock
          </button>
        </div>
        <p className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          Vault unlocked. Dashboard and input screens are built in Phase 5.
        </p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <VaultProvider>
      <Shell />
    </VaultProvider>
  );
}
