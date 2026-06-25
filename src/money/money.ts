/**
 * Integer-sen money helpers.
 *
 * RULE: money is NEVER stored or computed as a floating-point ringgit value.
 * All amounts are integer **sen** (1 RM = 100 sen). Floating point appears only
 * transiently inside a single rounding step, and display formatting is the only
 * place we divide by 100.
 */

/** Branded-ish alias to make intent clear at call sites. A value in integer sen. */
export type Sen = number;

export const SEN_PER_RINGGIT = 100;

export class InvalidAmountError extends Error {
  constructor(input: unknown) {
    super(`Invalid monetary amount: ${JSON.stringify(input)}`);
    this.name = 'InvalidAmountError';
  }
}

/** Round half away from zero to the nearest whole sen. */
function roundHalfUp(x: number): number {
  return x >= 0 ? Math.floor(x + 0.5) : Math.ceil(x - 0.5);
}

/**
 * Parse a ringgit amount (number or string) into integer sen, exactly.
 *
 * Accepts "1,234.56", "1234.5", "  12 ", 1234.5, etc. Rejects NaN, Infinity,
 * empty strings, and non-numeric text by throwing InvalidAmountError.
 * Strings are parsed digit-by-digit (no float) so there is no precision drift;
 * numbers are stringified first for the same reason.
 */
export function senFromRinggit(value: string | number): Sen {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new InvalidAmountError(value);
    value = value.toString();
  }
  if (typeof value !== 'string') throw new InvalidAmountError(value);

  // Strip thousands separators (commas) and all whitespace.
  const cleaned = value.replace(/,/g, '').replace(/\s/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '+') {
    throw new InvalidAmountError(value);
  }

  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) {
    throw new InvalidAmountError(value);
  }

  const sign = m[1] === '-' ? -1 : 1;
  const intDigits = m[2] === '' ? '0' : m[2];
  const fracRaw = m[3] ?? '';

  const intPart = Number(intDigits);
  // Take first two fractional digits; round using the third digit if present.
  const fracTwo = (fracRaw + '00').slice(0, 2);
  let cents = Number(fracTwo);
  if (fracRaw.length > 2 && Number(fracRaw[2]) >= 5) cents += 1;

  // cents may be 100 here if rounding carried (e.g. 1.999 -> 200 sen); the
  // expression below absorbs that carry correctly.
  const sen = intPart * SEN_PER_RINGGIT + cents;
  return sign * sen;
}

/** Like {@link senFromRinggit} but returns null instead of throwing. */
export function trySenFromRinggit(value: string | number): Sen | null {
  try {
    return senFromRinggit(value);
  } catch {
    return null;
  }
}

/** Ringgit number for display/charting ONLY. Do not feed back into money math. */
export function ringgitFromSen(sen: Sen): number {
  return sen / SEN_PER_RINGGIT;
}

/**
 * Format integer sen as a Malaysian-ringgit string with thousands separators
 * and exactly two decimals, e.g. 123456 -> "RM1,234.56".
 */
export function formatSen(
  sen: Sen,
  opts: { symbol?: boolean; signed?: boolean } = {},
): string {
  const { symbol = true, signed = false } = opts;
  const negative = sen < 0;
  const abs = Math.abs(Math.trunc(sen));
  const ringgit = Math.floor(abs / SEN_PER_RINGGIT);
  const cents = abs % SEN_PER_RINGGIT;
  const ringgitStr = ringgit.toLocaleString('en-MY');
  const body = `${ringgitStr}.${cents.toString().padStart(2, '0')}`;
  const prefix = symbol ? 'RM' : '';
  const signStr = negative ? '-' : signed ? '+' : '';
  return `${signStr}${prefix}${body}`;
}

/** Sum any number of sen values (all assumed integers). */
export function addSen(...values: Sen[]): Sen {
  return values.reduce((a, b) => a + b, 0);
}

/** a - b, in sen. */
export function subSen(a: Sen, b: Sen): Sen {
  return a - b;
}

/**
 * Apply a percentage `rate` (e.g. 11 for 11%, 0.5 for 0.5%) to an amount in sen,
 * returning integer sen rounded half-up. Integer-safe: `sen * rate` is computed
 * before dividing by 100.
 */
export function rateOfSen(sen: Sen, ratePercent: number): Sen {
  return roundHalfUp((sen * ratePercent) / 100);
}

/** Round a sen amount to the nearest 5 sen (used by the SOCSO/EIS tables). */
export function roundToNearest5Sen(sen: Sen): Sen {
  return roundHalfUp(sen / 5) * 5;
}

/**
 * Round a (possibly fractional) sen amount UP to the next whole ringgit.
 * Used by the EPF Third Schedule, whose contributions including cents are
 * rounded up to the next ringgit.
 */
export function roundUpToRinggit(senFloat: number): Sen {
  return Math.ceil(senFloat / 100) * 100;
}

/** Clamp to a minimum of zero (deductions/balances never go negative). */
export function clampMinZero(sen: Sen): Sen {
  return sen < 0 ? 0 : sen;
}

export { roundHalfUp };
