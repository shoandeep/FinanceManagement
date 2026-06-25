import { useEffect, useId, useState } from 'react';
import { useVault } from '../state/VaultContext';
import { deriveFinances } from '../state/selectors';
import { todayISO } from '../budget/dates';
import { exportCashflowCsv, exportExpensesCsv, exportIncomeCsv } from '../export/csv';
import { downloadReport, printReport } from '../export/report';
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
  const [printMsg, setPrintMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!data) return null;
  const f = deriveFinances(data, todayISO());
  const isAccount = session === 'account';

  function handlePrint() {
    setPrintMsg(null);
    const ok = printReport(data!, f);
    if (!ok) {
      downloadReport(data!, f);
      setPrintMsg('Pop-up blocked — downloaded the summary instead. Open it and press Ctrl/Cmd+P.');
    }
  }

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
        className="silk-panel my-8 w-full max-w-md space-y-6 rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg px-2 py-1 text-ink-faint transition hover:bg-gold/10 hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* Download & print */}
        <section id="settings-download" className="space-y-3 scroll-mt-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Download &amp; print</h3>
            <p className="mt-0.5 text-xs text-ink-faint">
              A branded summary (income, cashflow &amp; expenses) — built on your device, nothing
              sent anywhere.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => downloadReport(data, f)}>
              ⤓ Download summary
            </Button>
            <Button onClick={handlePrint}>🖨 Print / PDF</Button>
          </div>
          {printMsg && <p className="text-xs text-warning">{printMsg}</p>}
          <div className="rounded-xl border border-line p-3">
            <p className="mb-2 text-xs font-medium text-ink-soft">
              Spreadsheets (CSV — opens in Excel / Sheets)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => exportIncomeCsv(f)}>Income</Button>
              <Button onClick={() => exportExpensesCsv(data, f)}>Expenses</Button>
              <Button onClick={() => exportCashflowCsv(data, f)}>Cashflow</Button>
            </div>
          </div>
        </section>

        {isAccount ? (
          <>
            {/* Account & data */}
            <section className="space-y-2 border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-ink">Change passphrase</h3>
              <p className="text-xs text-ink-faint">
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
                <p className={`text-xs ${pwMsg.ok ? 'text-positive' : 'text-negative'}`}>{pwMsg.text}</p>
              )}
              <Button variant="primary" onClick={onChangePass} disabled={pwBusy} className="w-full">
                {pwBusy ? 'Working…' : 'Change passphrase'}
              </Button>
            </section>

            <section className="space-y-2 rounded-xl border border-negative/30 bg-negative/5 p-4">
              <h3 className="text-sm font-semibold text-negative">Danger zone</h3>
              <p className="text-xs text-negative/80">
                Permanently delete <strong>all</strong> stored data on this device. This cannot be
                undone.
              </p>
              {!shredOpen ? (
                <Button variant="danger" onClick={() => setShredOpen(true)} className="w-full">
                  Shred all data…
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-negative">
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
                      className="flex-1 border border-negative/40"
                    >
                      Permanently delete
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="border-t border-line pt-5 text-xs text-ink-faint">
            You're in guest mode. Choose “Save on this device” to set a passphrase, then you can change
            it or shred your data here.
          </p>
        )}
      </div>
    </div>
  );
}
