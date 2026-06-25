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

  const inputCls =
    'mt-1 w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-ring/30';

  return (
    <main className="weave-bg flex min-h-dvh items-center justify-center p-6 text-ink">
      <form
        onSubmit={onSubmit}
        className="silk-panel kain-edge animate-fade-up w-full max-w-sm rounded-2xl p-7"
        aria-labelledby="lock-title"
      >
        <button
          type="button"
          onClick={backToLanding}
          className="mb-3 text-sm text-ink-faint transition hover:text-gold"
        >
          ← Back
        </button>
        <h1 id="lock-title" className="font-display text-2xl font-semibold tracking-tight">
          {creating ? 'Create your passphrase' : 'Unlock Finance Guru'}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {creating
            ? 'Your data is encrypted on this device with this passphrase. There is no recovery if you lose it.'
            : 'Enter your passphrase to decrypt your data.'}
        </p>
        {creating && data && (data.pay.grossSen > 0 || data.fixedCosts.length > 0) && (
          <p className="mt-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary">
            Your current entries will be encrypted and saved.
          </p>
        )}

        <div className="mt-5">
          <label htmlFor={pwId} className="block text-sm font-medium text-ink-soft">
            Passphrase
          </label>
          <input
            id={pwId}
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {creating && (
          <div className="mt-3">
            <label htmlFor={confirmId} className="block text-sm font-medium text-ink-soft">
              Confirm passphrase
            </label>
            <input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              required
            />
          </div>
        )}

        {shownError && (
          <p role="alert" className="mt-3 text-sm text-negative">
            {shownError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-contrast transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-60"
        >
          {busy ? 'Working…' : creating ? 'Create & unlock' : 'Unlock'}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
          Estimates only — not financial or tax advice. Data stays on this device; nothing is sent
          anywhere.
        </p>
      </form>
    </main>
  );
}
