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
