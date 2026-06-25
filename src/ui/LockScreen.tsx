import { useId, useState, type FormEvent } from 'react';
import { useVault } from '../state/VaultContext';

/**
 * Passphrase gate shown whenever the vault is locked. Doubles as first-run setup
 * (create a passphrase) and subsequent unlocks.
 */
export function LockScreen() {
  const { initialized, busy, error, initialize, unlock, backToLanding, data } = useVault();
  const pwId = useId();
  const confirmId = useId();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const creating = !initialized;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (creating) {
      if (passphrase.length < 10) {
        setLocalError('Use at least 10 characters — a few random words works well.');
        return;
      }
      if (passphrase !== confirm) {
        setLocalError('Passphrases do not match.');
        return;
      }
      await initialize(passphrase);
    } else {
      await unlock(passphrase);
    }
  }

  const shownError = localError ?? error;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        aria-labelledby="lock-title"
      >
        <button
          type="button"
          onClick={backToLanding}
          className="mb-3 text-sm text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
        >
          ← Back
        </button>
        <h1 id="lock-title" className="text-xl font-semibold tracking-tight">
          {creating ? 'Create your passphrase' : 'Unlock Finance Guru'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {creating
            ? 'Your data is encrypted on this device with this passphrase. There is no recovery if you lose it.'
            : 'Enter your passphrase to decrypt your data.'}
        </p>
        {creating && data && (data.pay.grossSen > 0 || data.fixedCosts.length > 0) && (
          <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            Your current entries will be encrypted and saved.
          </p>
        )}

        <div className="mt-5">
          <label htmlFor={pwId} className="block text-sm font-medium">
            Passphrase
          </label>
          <input
            id={pwId}
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
            required
          />
        </div>

        {creating && (
          <div className="mt-3">
            <label htmlFor={confirmId} className="block text-sm font-medium">
              Confirm passphrase
            </label>
            <input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </div>
        )}

        {shownError && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {shownError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60"
        >
          {busy ? 'Working…' : creating ? 'Create & unlock' : 'Unlock'}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Estimates only — not financial or tax advice. Data stays on this device; nothing is sent
          anywhere.
        </p>
      </form>
    </main>
  );
}
