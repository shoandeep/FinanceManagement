import { describe, it, expect } from 'vitest';
import {
  MALAYSIAN_STATES,
  isWeekend,
  weekendLabel,
  holidaysOn,
  isPublicHoliday,
  isNonWorkingDay,
  previousWorkingDay,
} from './holidays';

describe('weekend convention', () => {
  it('defaults to Saturday & Sunday', () => {
    expect(isWeekend('2026-01-03')).toBe(true); // Sat
    expect(isWeekend('2026-01-04')).toBe(true); // Sun
    expect(isWeekend('2026-01-02')).toBe(false); // Fri
    expect(weekendLabel()).toBe('Sat & Sun');
  });
  it('uses Friday & Saturday for Johor/Kedah/Kelantan/Terengganu', () => {
    expect(isWeekend('2026-01-02', 'johor')).toBe(true); // Fri
    expect(isWeekend('2026-01-04', 'johor')).toBe(false); // Sun is a working day
    expect(isWeekend('2026-01-03', 'kelantan')).toBe(true); // Sat
    expect(weekendLabel('terengganu')).toBe('Fri & Sat');
  });
});

describe('holidaysOn', () => {
  it('returns national holidays for any state', () => {
    expect(holidaysOn('2026-08-31', 'sabah')).toEqual([{ name: 'National Day (Merdeka)', national: true }]);
    expect(holidaysOn('2026-08-31')[0].name).toBe('National Day (Merdeka)');
  });
  it('filters state-only holidays by state', () => {
    // 1 Feb 2026 is Thaipusam (8 states) and Federal Territory Day (KL/Labuan/Putrajaya).
    expect(holidaysOn('2026-02-01', 'selangor').map((h) => h.name)).toEqual(['Thaipusam']);
    expect(holidaysOn('2026-02-01', 'kuala-lumpur').map((h) => h.name)).toContain('Federal Territory Day');
    expect(holidaysOn('2026-02-01', 'sabah')).toEqual([]); // neither applies
    expect(holidaysOn('2026-02-01')).toEqual([]); // no state ⇒ no state-only holidays
  });
  it('honours national-except (Deepavali not in Sarawak; New Year not in some states)', () => {
    expect(holidaysOn('2026-11-08', 'selangor').map((h) => h.name)).toEqual(['Deepavali']);
    expect(holidaysOn('2026-11-08', 'sarawak')).toEqual([]);
    expect(holidaysOn('2026-01-01', 'johor')).toEqual([]); // no New Year in Johor
    expect(holidaysOn('2026-01-01', 'selangor').map((h) => h.name)).toEqual(["New Year's Day"]);
  });
});

describe('isPublicHoliday / isNonWorkingDay', () => {
  it('treats weekends and holidays as non-working', () => {
    expect(isPublicHoliday('2026-08-31')).toBe(true);
    expect(isNonWorkingDay('2026-08-31')).toBe(true); // Merdeka
    expect(isNonWorkingDay('2026-01-03')).toBe(true); // Sat
    expect(isNonWorkingDay('2026-07-15')).toBe(false); // ordinary Wednesday
  });
});

describe('previousWorkingDay', () => {
  it('brings a weekend payday back to Friday', () => {
    expect(previousWorkingDay('2026-01-03')).toBe('2026-01-02'); // Sat → Fri
    expect(previousWorkingDay('2026-01-04')).toBe('2026-01-02'); // Sun → Fri
  });
  it('chains back over a holiday that abuts a weekend', () => {
    // 1 Jun 2026 = Agong birthday (Mon) · 31 May = Wesak (Sun) · 30 May = Sat → 29 May (Fri).
    expect(previousWorkingDay('2026-06-01')).toBe('2026-05-29');
  });
  it('returns the same date when it is already a working day', () => {
    expect(previousWorkingDay('2026-07-15')).toBe('2026-07-15');
  });
  it('respects the Friday/Saturday weekend for eastern states', () => {
    // For Johor, Sunday is a working day, so a Sunday payday is not shifted.
    expect(previousWorkingDay('2026-01-04', 'johor')).toBe('2026-01-04');
  });
});

describe('state list', () => {
  it('covers all 13 states + 3 federal territories', () => {
    expect(MALAYSIAN_STATES).toHaveLength(16);
  });
});
