/**
 * Branded, self-contained HTML financial summary — carries the Finance Guru look
 * (songket gold/teal, serif headings, ledger figures) so the downloaded/printed
 * file feels like the app. No scripts, no external resources: it opens and prints
 * anywhere and stays valid under the strict CSP (inline styles only).
 */
import type { AppData } from '../model/types';
import type { Finances } from '../state/selectors';

const rm = (sen: number): string => `RM${(sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Escape user-entered text for safe HTML embedding. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const row = (label: string, value: string, opts: { strong?: boolean; indent?: boolean; tone?: 'pos' | 'neg' } = {}) =>
  `<tr class="${opts.strong ? 'strong' : ''}">
     <td class="${opts.indent ? 'indent' : ''}">${esc(label)}</td>
     <td class="num ${opts.tone ?? ''}">${esc(value)}</td>
   </tr>`;

/** A complete standalone HTML document for the financial summary. */
export function reportDocument(data: AppData, f: Finances): string {
  const today = new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
  const catName = (id: string) => data.variableCategories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const p = f.pay;

  const incomeRows = [
    row('Gross monthly pay', rm(p.grossSen), { strong: true }),
    row('EPF (employee)', `−${rm(p.epf.amountSen)}`, { indent: true }),
    row('SOCSO (employee)', `−${rm(p.socso.amountSen)}`, { indent: true }),
    row('EIS (employee)', `−${rm(p.eis.amountSen)}`, { indent: true }),
    row('PCB (income tax)', `−${rm(p.pcb.amountSen)}`, { indent: true }),
    row('Net pay', rm(p.netSen), { strong: true, tone: 'pos' }),
  ].join('');

  const cashflowRows = [
    row('Net pay (monthly income)', rm(p.netSen), { strong: true }),
    row('Total fixed costs', `−${rm(f.totalFixedSen)}`),
    ...data.fixedCosts.map((c) => row(c.name || 'Cost', `−${rm(c.amountSen)}`, { indent: true })),
    row('Disposable (net − fixed)', rm(f.disposableSen), { strong: true }),
    row('Savings allocation', rm(f.allocation.savingsSen), { indent: true }),
    row('Investments allocation', rm(f.allocation.investmentsSen), { indent: true }),
    row('Variable spending budget', rm(f.allocation.variableSen), { indent: true }),
    row('Spent this month', `−${rm(f.spending.spentMonthSen)}`),
    row('Emergency fund', `${rm(f.emergency.currentSen)} / ${rm(f.emergency.targetSen)}`),
    row('Investments total', rm(f.investmentsTotalSen)),
  ].join('');

  const expenses = [...data.expenses].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
  const expenseRows = expenses.length
    ? expenses
        .map(
          (e) => `<tr>
            <td>${esc(e.dateISO)}</td>
            <td>${esc(catName(e.categoryId))}${e.note ? ` <span class="muted">· ${esc(e.note)}</span>` : ''}</td>
            <td class="num">${esc(rm(e.amountSen))}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="muted">No expenses logged.</td></tr>`;

  const goalsRows = data.goals.length
    ? `<h2>Savings goals</h2><table>${data.goals
        .map((g) =>
          row(
            `${g.name || 'Goal'}${g.deadline ? ` (by ${esc(g.deadline)})` : ''}`,
            `${rm(g.currentSen)} / ${rm(g.targetSen)}`,
          ),
        )
        .join('')}</table>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Finance Guru — Financial Summary</title>
<style>
  :root { --ink:#0c2b27; --soft:#3c5a55; --gold:#9a6f1e; --gold2:#caa23a; --teal:#117b6e; --line:#e4d9bf; --paper:#fbf6e9; --neg:#9c2b3b; }
  * { box-sizing:border-box; }
  body { margin:0; background:#efe7d3; color:var(--ink); font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sheet { max-width:760px; margin:24px auto; background:var(--paper); border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:0 14px 40px -28px rgba(0,0,0,.5); }
  .topbar { height:6px; background:linear-gradient(90deg,transparent,var(--gold2) 18%,#f0d27a 50%,var(--gold2) 82%,transparent); }
  .pad { padding:30px 34px; }
  header.hd { display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid var(--line); padding-bottom:18px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .logo { width:42px; height:42px; border-radius:11px; background:var(--teal); color:#fdf6df; display:grid; place-items:center; font-weight:800; letter-spacing:.5px; box-shadow:0 0 0 1.5px rgba(202,162,58,.55); }
  .brand h1 { margin:0; font-family:Georgia,'Times New Roman',serif; font-size:21px; }
  .brand p { margin:2px 0 0; color:var(--soft); font-size:12.5px; }
  .meta { text-align:right; color:var(--soft); font-size:12.5px; }
  h2 { font-family:Georgia,'Times New Roman',serif; font-size:16px; margin:26px 0 10px; color:var(--ink); position:relative; padding-left:13px; }
  h2::before { content:''; position:absolute; left:0; top:2px; bottom:2px; width:4px; border-radius:3px; background:var(--gold2); }
  table { width:100%; border-collapse:collapse; font-size:13.5px; }
  td, th { padding:7px 4px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  th { color:var(--soft); font-weight:600; font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; }
  td.num, th.num { text-align:right; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-variant-numeric:tabular-nums; white-space:nowrap; }
  td.indent { padding-left:18px; color:var(--soft); }
  tr.strong td { font-weight:800; border-bottom:2px solid var(--gold2); }
  .num.pos { color:var(--teal); } .num.neg { color:var(--neg); }
  .muted { color:var(--soft); }
  .note { margin-top:8px; font-size:11.5px; color:var(--soft); }
  footer { margin-top:26px; border-top:1px solid var(--line); padding-top:14px; font-size:11px; color:var(--soft); }
  @media print { body { background:#fff; } .sheet { margin:0; border:none; box-shadow:none; border-radius:0; } @page { margin:14mm; } }
</style></head>
<body>
  <div class="sheet">
    <div class="topbar"></div>
    <div class="pad">
      <header class="hd">
        <div class="brand">
          <div class="logo">FG</div>
          <div><h1>Finance Guru</h1><p>Financial summary · Malaysia</p></div>
        </div>
        <div class="meta">Generated<br/><strong>${esc(today)}</strong></div>
      </header>

      <h2>Income &amp; deductions (monthly)</h2>
      <table>${incomeRows}</table>

      <h2>Cashflow / income statement</h2>
      <table>${cashflowRows}</table>

      ${goalsRows}

      <h2>Expenses</h2>
      <table>
        <tr><th>Date</th><th>Category</th><th class="num">Amount</th></tr>
        ${expenseRows}
      </table>
      <p class="note">Tip: press Ctrl/Cmd + P to print or save this as a PDF.</p>

      <footer>
        Estimates only — not financial or tax advice. Auto-calculated figures are estimates; your
        payslip is the source of truth. Confirm against LHDN / KWSP / PERKESO. Generated entirely on
        your device by Finance Guru — no data was sent anywhere.
      </footer>
    </div>
  </div>
</body></html>`;
}

function downloadHtml(filename: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadReport(data: AppData, f: Finances): void {
  downloadHtml(`finance-guru-summary-${f.todayISO}.html`, reportDocument(data, f));
}

/** Open the branded summary in a new window and trigger the print dialog. */
export function printReport(data: AppData, f: Finances): boolean {
  const w = window.open('', '_blank', 'noopener,width=900,height=1000');
  if (!w) return false; // popup blocked — caller should fall back to download
  w.document.write(reportDocument(data, f));
  w.document.close();
  w.focus();
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* user can print manually */
    }
  }, 350);
  return true;
}
