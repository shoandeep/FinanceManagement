import { describe, it, expect } from 'vitest';
import { currentPayPeriod, paydayForMonth } from './payperiod';
import type { PayPeriodConfig } from '../model/types';

const cfg = (p: Partial<PayPeriodConfig>): PayPeriodConfig => ({
  mode: 'sameDay',
  dayOfMonth: 25,
  customDates: {},
  ...p,
});

describe('paydayForMonth', () => {
  it('uses the configured day, clamped to month length', () => {
    expect(paydayForMonth(cfg({ dayOfMonth: 25 }), 2026, 6)).toBe('2026-06-25');
    expect(paydayForMonth(cfg({ dayOfMonth: 31 }), 2026, 2)).toBe('2026-02-28'); // clamp
  });
  it('honours per-month overrides', () => {
    expect(paydayForMonth(cfg({ customDates: { '2026-07': '2026-07-30' } }), 2026, 7)).toBe('2026-07-30');
  });

  describe('adjustForHolidays', () => {
    it('does not shift when the flag is off', () => {
      // 25 Jul 2026 is a Saturday, but with the flag off the payday stays put.
      expect(paydayForMonth(cfg({ dayOfMonth: 25 }), 2026, 7)).toBe('2026-07-25');
    });
    it('brings a weekend payday forward to the preceding working day', () => {
      // 25 Jul 2026 (Sat) → Fri 24 Jul.
      expect(paydayForMonth(cfg({ dayOfMonth: 25, adjustForHolidays: true }), 2026, 7)).toBe('2026-07-24');
    });
    it('chains back over a holiday adjoining the weekend', () => {
      // 1 Jun 2026 = Agong birthday (Mon) → back over Wesak (Sun) + Sat → Fri 29 May.
      expect(paydayForMonth(cfg({ dayOfMonth: 1, adjustForHolidays: true }), 2026, 6)).toBe('2026-05-29');
    });
    it('never moves an explicit per-month override', () => {
      const c = cfg({ adjustForHolidays: true, customDates: { '2026-07': '2026-07-25' } });
      expect(paydayForMonth(c, 2026, 7)).toBe('2026-07-25'); // Saturday, but explicit
    });
    it('uses the state weekend rule (Sunday is a working day in Johor)', () => {
      // 26 Jul 2026 is a Sunday. Sat/Sun states shift to Fri 24; Johor (Fri/Sat) keeps it.
      expect(paydayForMonth(cfg({ dayOfMonth: 26, adjustForHolidays: true }), 2026, 7)).toBe('2026-07-24');
      expect(paydayForMonth(cfg({ dayOfMonth: 26, adjustForHolidays: true }), 2026, 7, 'johor')).toBe('2026-07-26');
    });
  });
});

describe('currentPayPeriod', () => {
  it('calendar month: 1st → end of month', () => {
    const p = currentPayPeriod(cfg({ mode: 'calendarMonth' }), '2026-06-25');
    expect(p.startISO).toBe('2026-06-01');
    expect(p.endISO).toBe('2026-07-01');
    expect(p.daysInPeriod).toBe(30);
    expect(p.daysRemaining).toBe(6);
    expect(p.daysElapsed).toBe(25);
  });

  it('same day: payday → next payday (on payday)', () => {
    const p = currentPayPeriod(cfg({ dayOfMonth: 25 }), '2026-06-25');
    expect(p.startISO).toBe('2026-06-25');
    expect(p.endISO).toBe('2026-07-25');
    expect(p.daysInPeriod).toBe(30);
    expect(p.daysElapsed).toBe(1);
  });

  it('same day: before this month’s payday uses the previous cycle', () => {
    const p = currentPayPeriod(cfg({ dayOfMonth: 25 }), '2026-06-20');
    expect(p.startISO).toBe('2026-05-25');
    expect(p.endISO).toBe('2026-06-25');
    expect(p.daysRemaining).toBe(5);
  });

  it('custom: stretches across a longer gap (paid 20 Jun, then 30 Jul)', () => {
    const c = cfg({ mode: 'custom', customDates: { '2026-06': '2026-06-20', '2026-07': '2026-07-30' } });
    const p = currentPayPeriod(c, '2026-06-25');
    expect(p.startISO).toBe('2026-06-20');
    expect(p.endISO).toBe('2026-07-30');
    expect(p.daysInPeriod).toBe(40); // stretched
    expect(p.daysRemaining).toBe(35);
  });
});
