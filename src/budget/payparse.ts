/**
 * Parse a shared/pasted payment confirmation (bank SMS, e-wallet receipt, etc.)
 * into an amount + merchant guess, so capture can be pre-filled. Heuristic and
 * forgiving — anything it can't read is just left for the user. Pure/deterministic.
 *
 * Handles common Malaysian formats, e.g.:
 *   "You have paid RM45.00 to GRAB via DuitNow on 28/06/2026"
 *   "Payment of RM12.50 to 7-Eleven successful"
 *   "Order total: RM89.90. Thank you for shopping at Shopee"
 */
import { senFromRinggit, type Sen } from '../money/money';

export interface ParsedPayment {
  amountSen?: Sen;
  note?: string;
}

const AMOUNT_RE = /(?:RM|MYR)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
const KW_RE = /\b(paid|payment|total|amount|spent|debited|purchase|transaction|transfer|charged)\b/i;
const TOTAL_RE = /\b(grand total|total|amount due)\b/i;
const MERCHANT_RE =
  /\b(?:paid to|payment to|pay to|transfer to|to|at)\b\s+([A-Za-z0-9][A-Za-z0-9 .,&'*/-]*?)\s*(?=\b(?:via|on|ref|reference|successful|completed|dated|for|amount|rm|myr|by|using|dengan|pada)\b|[.\n;|]|$)/i;

function lineAround(text: string, idx: number): string {
  const start = text.lastIndexOf('\n', idx) + 1;
  let end = text.indexOf('\n', idx);
  if (end === -1) end = text.length;
  return text.slice(start, end);
}

function cleanMerchant(s: string): string {
  return s
    .replace(/[*]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,.;|-]+$/g, '')
    .trim();
}

export function parsePaymentText(text: string, title?: string): ParsedPayment {
  const out: ParsedPayment = {};
  const body = [title, text].filter(Boolean).join('\n');

  // --- amount ---
  const found: { sen: Sen; line: string }[] = [];
  let m: RegExpExecArray | null;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(body))) {
    try {
      found.push({ sen: senFromRinggit(m[1]), line: lineAround(body, m.index) });
    } catch {
      /* not a valid amount — skip */
    }
  }
  if (found.length === 1) {
    out.amountSen = found[0].sen;
  } else if (found.length > 1) {
    const totals = found.filter((f) => TOTAL_RE.test(f.line));
    if (totals.length) {
      out.amountSen = totals[totals.length - 1].sen; // grand total tends to be last
    } else {
      const keyed = found.find((f) => KW_RE.test(f.line));
      out.amountSen = keyed ? keyed.sen : found.reduce((a, b) => (b.sen > a.sen ? b : a)).sen;
    }
  }

  // --- merchant ---
  const mm = MERCHANT_RE.exec(body);
  let note = mm ? cleanMerchant(mm[1]) : '';
  if ((!note || note.length < 2) && title) {
    const t = title.trim();
    if (t.length >= 2 && !/^(?:RM|MYR)/i.test(t)) note = t;
  }
  if (note.length >= 2 && !/^\d+$/.test(note)) out.note = note;

  return out;
}
