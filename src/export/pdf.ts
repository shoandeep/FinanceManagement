/**
 * PDF financial summary — generated entirely on-device, no network calls.
 *
 * Uses jsPDF with its built-in standard-14 PDF fonts (Helvetica, Courier).
 * No external fonts are fetched, no eval/new Function used at runtime.
 * Lazy-loaded via dynamic import so it ships as a separate Vite chunk and
 * does not inflate the initial PWA bundle.
 *
 * Money is ALWAYS in integer sen; formatted via sen/100 with en-MY locale,
 * identical to the rm() helper in report.ts.
 */
import type { AppData } from '../model/types';
import type { Finances } from '../state/selectors';

// ── money helpers ────────────────────────────────────────────────────────────

const rm = (sen: number): string =>
  `RM${(sen / 100).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Sanitise user-entered text — strip control chars, keep as plain string. */
function safe(v: unknown): string {
  return String(v ?? '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

// ── brand colours (hex → RGB triples for jsPDF) ──────────────────────────────

const GOLD = [202, 162, 58] as const;   // #caa23a
const TEAL = [17, 123, 110] as const;   // #117b6e
const INK  = [12, 43, 39] as const;     // #0c2b27
const SOFT = [60, 90, 85] as const;     // #3c5a55
const LINE = [200, 188, 160] as const;  // muted divider

// ── layout constants (mm) ────────────────────────────────────────────────────

const ML = 15;   // left margin
const MR = 15;   // right margin
const MT = 18;   // top margin
const MB = 18;   // bottom margin

// Page is A4: 210 × 297 mm
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - ML - MR;  // 180 mm


// ── PDF layout helpers ───────────────────────────────────────────────────────

type RGB = readonly [number, number, number];

interface Ctx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;          // jsPDF instance (typed as any to avoid import-time load)
  y: number;         // current vertical cursor (mm)
  pageH: number;
}

function newPage(ctx: Ctx): void {
  ctx.doc.addPage();
  ctx.y = MT;
  // Re-draw the gold top-bar on each new page
  drawTopBar(ctx);
}

/** Ensure at least `needed` mm remain on the page; if not, add a new page. */
function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y + needed > PAGE_H - MB) {
    newPage(ctx);
  }
}

function setColor(ctx: Ctx, rgb: RGB): void {
  ctx.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function drawTopBar(ctx: Ctx): void {
  ctx.doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  ctx.doc.rect(0, 0, PAGE_W, 3, 'F');
}

/** Draw a horizontal rule. */
function hRule(ctx: Ctx, r: RGB = LINE, lw = 0.3): void {
  ctx.doc.setDrawColor(r[0], r[1], r[2]);
  ctx.doc.setLineWidth(lw);
  ctx.doc.line(ML, ctx.y, ML + CONTENT_W, ctx.y);
}

/** Advance cursor by `mm`. */
function advance(ctx: Ctx, mm: number): void {
  ctx.y += mm;
}

/** Print a section heading with a gold left accent bar. */
function sectionHeading(ctx: Ctx, title: string): void {
  ensureSpace(ctx, 14);
  advance(ctx, 4);
  // Gold accent bar
  ctx.doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  ctx.doc.rect(ML, ctx.y - 3.5, 2.5, 5, 'F');
  // Heading text
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(11);
  setColor(ctx, INK);
  ctx.doc.text(safe(title), ML + 5, ctx.y);
  advance(ctx, 6);
  hRule(ctx, GOLD, 0.5);
  advance(ctx, 2);
}

/**
 * Print a label/value row.
 * @param indent   sub-item indent (mm)
 * @param bold     render both columns bold
 * @param toneRgb  colour override for the value column
 */
function dataRow(
  ctx: Ctx,
  label: string,
  value: string,
  opts: {
    indent?: number;
    bold?: boolean;
    toneRgb?: RGB;
  } = {},
): void {
  ensureSpace(ctx, 7);

  const indent = opts.indent ?? 0;
  const style = opts.bold ? 'bold' : 'normal';
  const labelX = ML + indent;

  ctx.doc.setFontSize(9.5);
  ctx.doc.setFont('helvetica', style);
  setColor(ctx, opts.indent ? SOFT : INK);
  ctx.doc.text(safe(label), labelX, ctx.y);

  ctx.doc.setFont('courier', style);
  setColor(ctx, opts.toneRgb ?? INK);
  ctx.doc.text(safe(value), ML + CONTENT_W, ctx.y, { align: 'right' });

  // Reset
  setColor(ctx, INK);

  advance(ctx, 5.5);

  // Bold rows get a heavier divider
  if (opts.bold) {
    hRule(ctx, GOLD, 0.6);
    advance(ctx, 1.5);
  }
}

/** Thin divider between rows. */
function rowDivider(ctx: Ctx): void {
  hRule(ctx, LINE, 0.2);
  advance(ctx, 0.5);
}

// ── Expenses table ───────────────────────────────────────────────────────────

const EXP_COL = {
  date:   { x: ML,      w: 25 },
  cat:    { x: ML + 25, w: 115 },
  amt:    { x: ML + 140, w: 40 },
} as const;

function expTableHeader(ctx: Ctx): void {
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(8);
  setColor(ctx, SOFT);
  ctx.doc.text('DATE',     EXP_COL.date.x, ctx.y);
  ctx.doc.text('CATEGORY', EXP_COL.cat.x,  ctx.y);
  ctx.doc.text('AMOUNT',   ML + CONTENT_W,  ctx.y, { align: 'right' });
  advance(ctx, 3);
  hRule(ctx, TEAL, 0.5);
  advance(ctx, 2.5);
}

function expTableRow(ctx: Ctx, date: string, category: string, note: string, amount: string): void {
  ensureSpace(ctx, 8);

  // If we rolled to a new page, re-draw the header
  const beforeY = ctx.y;
  if (ctx.y === MT) {
    // Just landed on a fresh page (newPage sets ctx.y = MT)
    expTableHeader(ctx);
  } else {
    // Detect page roll from ensureSpace
    void beforeY;
  }

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9);
  setColor(ctx, SOFT);
  ctx.doc.text(safe(date), EXP_COL.date.x, ctx.y);

  setColor(ctx, INK);
  const catFull = note ? `${safe(category)}  ${safe(note)}` : safe(category);
  // Truncate long category+note to fit column
  const maxCatW = EXP_COL.cat.w - 2;
  const catLines: string[] = ctx.doc.splitTextToSize(catFull, maxCatW) as string[];
  const catLine = (catLines[0] ?? catFull) as string;
  ctx.doc.text(catLine, EXP_COL.cat.x, ctx.y);

  ctx.doc.setFont('courier', 'normal');
  ctx.doc.text(safe(amount), ML + CONTENT_W, ctx.y, { align: 'right' });

  advance(ctx, 5);
  hRule(ctx, LINE, 0.2);
  advance(ctx, 0.5);
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function downloadPdf(data: AppData, f: Finances): Promise<void> {
  // Dynamic import → own Vite chunk, not in the initial bundle
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const ctx: Ctx = { doc, y: MT, pageH: PAGE_H };

  doc.setProperties({
    title: 'Finance Guru — Financial Summary',
    subject: 'Personal finance summary',
    creator: 'Finance Guru (finance-guru PWA)',
  });

  // ── Gold top bar ────────────────────────────────────────────────────────────
  drawTopBar(ctx);

  // ── Header ──────────────────────────────────────────────────────────────────
  // Logo box
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.roundedRect(ML, ctx.y, 12, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(ctx, [253, 246, 223] as RGB);
  doc.text('FG', ML + 6, ctx.y + 7.5, { align: 'center' });

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setColor(ctx, INK);
  doc.text('Finance Guru', ML + 15, ctx.y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(ctx, SOFT);
  doc.text('Financial Summary · Malaysia', ML + 15, ctx.y + 10);

  // Date (right-aligned)
  const today = new Date().toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(ctx, SOFT);
  doc.text('Generated', ML + CONTENT_W, ctx.y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  setColor(ctx, INK);
  doc.text(today, ML + CONTENT_W, ctx.y + 9, { align: 'right' });

  ctx.y += 16;
  hRule(ctx, LINE, 0.5);
  advance(ctx, 3);

  // ── Income & deductions ─────────────────────────────────────────────────────
  const p = f.pay;
  sectionHeading(ctx, 'Income & deductions (monthly)');
  dataRow(ctx, 'Gross monthly pay', rm(p.grossSen), { bold: true });
  dataRow(ctx, 'EPF (employee)',     `-${rm(p.epf.amountSen)}`,   { indent: 5 });
  rowDivider(ctx);
  dataRow(ctx, 'SOCSO (employee)',   `-${rm(p.socso.amountSen)}`, { indent: 5 });
  rowDivider(ctx);
  dataRow(ctx, 'EIS (employee)',     `-${rm(p.eis.amountSen)}`,   { indent: 5 });
  rowDivider(ctx);
  dataRow(ctx, 'PCB (income tax)',   `-${rm(p.pcb.amountSen)}`,   { indent: 5 });
  dataRow(ctx, 'Net pay',            rm(p.netSen),                { bold: true, toneRgb: TEAL });

  // ── Cashflow ────────────────────────────────────────────────────────────────
  sectionHeading(ctx, 'Cashflow / income statement');
  dataRow(ctx, 'Net pay (monthly income)', rm(p.netSen), { bold: true });
  dataRow(ctx, 'Total fixed costs',        `-${rm(f.totalFixedSen)}`);
  for (const c of data.fixedCosts) {
    dataRow(ctx, safe(c.name || 'Cost'), `-${rm(c.amountSen)}`, { indent: 5 });
    rowDivider(ctx);
  }
  dataRow(ctx, 'Disposable (net − fixed)', rm(f.disposableSen), { bold: true });
  dataRow(ctx, 'Savings allocation',       rm(f.allocation.savingsSen),     { indent: 5 });
  rowDivider(ctx);
  dataRow(ctx, 'Investments allocation',   rm(f.allocation.investmentsSen), { indent: 5 });
  rowDivider(ctx);
  dataRow(ctx, 'Variable spending budget', rm(f.allocation.variableSen),    { indent: 5 });
  dataRow(ctx, 'Spent this month',         `-${rm(f.spending.spentMonthSen)}`);
  rowDivider(ctx);
  dataRow(ctx, 'Emergency fund',           `${rm(f.emergency.currentSen)} / ${rm(f.emergency.targetSen)}`);
  rowDivider(ctx);
  dataRow(ctx, 'Investments total',        rm(f.investmentsTotalSen));

  // ── Savings goals ───────────────────────────────────────────────────────────
  if (data.goals.length > 0) {
    sectionHeading(ctx, 'Savings goals');
    for (const g of data.goals) {
      const label = g.deadline
        ? `${safe(g.name || 'Goal')}  (by ${safe(g.deadline)})`
        : safe(g.name || 'Goal');
      dataRow(ctx, label, `${rm(g.currentSen)} / ${rm(g.targetSen)}`);
      rowDivider(ctx);
    }
  }

  // ── Expenses table ──────────────────────────────────────────────────────────
  sectionHeading(ctx, 'Expenses');

  const catName = (id: string) =>
    data.variableCategories.find((c) => c.id === id)?.name ?? 'Uncategorised';

  const expenses = [...data.expenses].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

  if (expenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    setColor(ctx, SOFT);
    doc.text('No expenses logged.', ML, ctx.y);
    advance(ctx, 6);
  } else {
    expTableHeader(ctx);
    for (const e of expenses) {
      expTableRow(ctx, safe(e.dateISO), safe(catName(e.categoryId)), safe(e.note ?? ''), rm(e.amountSen));
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  ensureSpace(ctx, 24);
  advance(ctx, 4);
  hRule(ctx, LINE, 0.4);
  advance(ctx, 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(ctx, SOFT);
  const footerText =
    'Estimates only — not financial or tax advice. Auto-calculated figures are estimates; your payslip is the source of truth. ' +
    'Confirm against LHDN / KWSP / PERKESO. Generated entirely on your device by Finance Guru — no data was sent anywhere.';
  const footerLines: string[] = doc.splitTextToSize(footerText, CONTENT_W) as string[];
  doc.text(footerLines, ML, ctx.y);

  // ── Save ────────────────────────────────────────────────────────────────────
  doc.save(`finance-guru-summary-${f.todayISO}.pdf`, { returnPromise: true });
}
