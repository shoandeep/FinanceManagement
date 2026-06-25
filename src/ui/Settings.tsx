import { useEffect, useId, useState } from 'react';
import { useVault } from '../state/VaultContext';
import { deriveFinances } from '../state/selectors';
import { todayISO } from '../budget/dates';
import { exportCashflowCsv, exportExpensesCsv, exportIncomeCsv } from '../export/csv';
import { Button, TextInput } from './components';

export function Settings({ onClose }: { onClose: () => void }) {
  const { data, session, changePassphrase, shred } = useVault();
  const newId = useId();
  const confirmId = useId();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [shredOpen, setShredOpen] = useState(false);
  const [shredText, setShredText] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!data) return null;
  const f = deriveFinances(data, todayISO());
  const isAccount = session === 'account';

  async function onChangePass() {
    setPwMsg(null);
    if (newPass.length < 10) return setPwMsg({ ok: false, text: 'Use at least 10 characters.' });
    if (newPass !== confirmPass) return setPwMsg({ ok: false, text: 'Passphrases do not match.' });
    setPwBusy(true);
    try {
      await changePassphrase(newPass);
      setNewPass('');
      setConfirmPass('');
      setPwMsg({ ok: true, text: 'Passphrase changed.' });
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to change passphrase.' });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="my-8 w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Export */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Export reports</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Downloads a CSV (opens in Excel / Google Sheets). Built on your device — nothing is sent
            anywhere.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => exportIncomeCsv(f)}>Income</Button>
            <Button onClick={() => exportExpensesCsv(data, f)}>Expenses</Button>
            <Button onClick={() => exportCashflowCsv(data, f)}>Cashflow</Button>
          </div>
        </section>

        {isAccount ? (
          <>
            {/* Change passphrase */}
            <section className="space-y-2 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Change passphrase
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Re-encrypts your data with a new passphrase. There is no recovery without it — if you
                forget it, the only option is to shred and start over.
              </p>
              <label htmlFor={newId} className="sr-only">
                New passphrase
              </label>
              <TextInput
                id={newId}
                type="password"
                autoComplete="new-password"
                placeholder="New passphrase"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <label htmlFor={confirmId} className="sr-only">
                Confirm new passphrase
              </label>
              <TextInput
                id={confirmId}
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new passphrase"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              />
              {pwMsg && (
                <p
                  className={`text-xs ${pwMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {pwMsg.text}
                </p>
              )}
              <Button variant="primary" onClick={onChangePass} disabled={pwBusy} className="w-full">
                {pwBusy ? 'Working…' : 'Change passphrase'}
              </Button>
            </section>

            {/* Danger zone */}
            <section className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
              <p className="text-xs text-red-700/80 dark:text-red-300/80">
                Permanently delete <strong>all</strong> stored data on this device. This cannot be
                undone.
              </p>
              {!shredOpen ? (
                <Button variant="danger" onClick={() => setShredOpen(true)} className="w-full">
                  Shred all data…
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Type <strong>DELETE</strong> to confirm:
                  </p>
                  <TextInput
                    value={shredText}
                    onChange={(e) => setShredText(e.target.value)}
                    aria-label="Type DELETE to confirm"
                    placeholder="DELETE"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => { setShredOpen(false); setShredText(''); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      disabled={shredText !== 'DELETE'}
                      onClick={() => void shred()}
                      className="flex-1 border border-red-300 dark:border-red-800"
                    >
                      Permanently delete
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
            You're in guest mode. Choose “Save on this device” to set a passphrase, then you can change
            it or shred your data here.
          </p>
        )}
      </div>
    </div>
  );
}
