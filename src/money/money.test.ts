import { describe, it, expect } from 'vitest';
import {
  senFromRinggit,
  trySenFromRinggit,
  formatSen,
  rateOfSen,
  roundToNearest5Sen,
  addSen,
  subSen,
  clampMinZero,
  InvalidAmountError,
} from './money';

describe('senFromRinggit', () => {
  it('parses plain and decimal ringgit exactly', () => {
    expect(senFromRinggit(5000)).toBe(500_000);
    expect(senFromRinggit('5000')).toBe(500_000);
    expect(senFromRinggit('1234.56')).toBe(123_456);
    expect(senFromRinggit('0.05')).toBe(5);
    expect(senFromRinggit('0.1')).toBe(10);
  });

  it('strips thousands separators and whitespace', () => {
    expect(senFromRinggit('1,234.56')).toBe(123_456);
    expect(senFromRinggit('  12 ')).toBe(1_200);
  });

  it('rounds the third decimal half-up, carrying when needed', () => {
    expect(senFromRinggit('1.005')).toBe(101); // 100 -> +1
    expect(senFromRinggit('1.999')).toBe(200); // carry to RM2.00
    expect(senFromRinggit('1.004')).toBe(100);
  });

  it('handles negatives', () => {
    expect(senFromRinggit('-12.34')).toBe(-1_234);
  });

  it('rejects NaN, Infinity, empty and junk', () => {
    expect(() => senFromRinggit('')).toThrow(InvalidAmountError);
    expect(() => senFromRinggit('abc')).toThrow(InvalidAmountError);
    expect(() => senFromRinggit('1.2.3')).toThrow(InvalidAmountError);
    expect(() => senFromRinggit(NaN)).toThrow(InvalidAmountError);
    expect(() => senFromRinggit(Infinity)).toThrow(InvalidAmountError);
    expect(trySenFromRinggit('nope')).toBeNull();
  });
});

describe('formatSen', () => {
  it('formats as RM with separators and 2 decimals', () => {
    expect(formatSen(123_456)).toBe('RM1,234.56');
    expect(formatSen(500_000)).toBe('RM5,000.00');
    expect(formatSen(5)).toBe('RM0.05');
    expect(formatSen(-1_234)).toBe('-RM12.34');
    expect(formatSen(100, { symbol: false })).toBe('1.00');
    expect(formatSen(100, { signed: true })).toBe('+RM1.00');
  });
});

describe('arithmetic helpers', () => {
  it('rateOfSen applies a percentage with half-up rounding', () => {
    expect(rateOfSen(500_000, 11)).toBe(55_000); // 11% of RM5,000 = RM550
    expect(rateOfSen(100, 0.5)).toBe(1); // 0.5% of RM1.00 = 0.005 -> 1 sen
  });

  it('roundToNearest5Sen rounds to the nearest 5 sen', () => {
    expect(roundToNearest5Sen(10_412.5)).toBe(10_415);
    expect(roundToNearest5Sen(2_975)).toBe(2_975);
    expect(roundToNearest5Sen(11)).toBe(10);
    expect(roundToNearest5Sen(13)).toBe(15);
  });

  it('add/sub/clamp', () => {
    expect(addSen(100, 200, 300)).toBe(600);
    expect(subSen(500, 200)).toBe(300);
    expect(clampMinZero(-5)).toBe(0);
    expect(clampMinZero(5)).toBe(5);
  });
});

describe('no precision drift over repeated edits (spec 7.4)', () => {
  it('keeps integer sen exact across many add/sub cycles', () => {
    let balance = senFromRinggit('1234.56');
    for (let i = 0; i < 10_000; i++) {
      balance = addSen(balance, senFromRinggit('0.07'));
      balance = subSen(balance, senFromRinggit('0.07'));
    }
    expect(balance).toBe(123_456);
    expect(Number.isInteger(balance)).toBe(true);
    expect(formatSen(balance)).toBe('RM1,234.56');
  });
});
