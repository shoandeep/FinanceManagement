import { describe, it, expect } from 'vitest';
import { brandEmoji, eventEmoji } from './brand';
import type { RecurringEvent } from '../model/types';

describe('brandEmoji', () => {
  it('recognises telcos', () => {
    expect(brandEmoji('T-Mobile', 'bill')).toBe('📱');
    expect(brandEmoji('Maxis Postpaid', 'bill')).toBe('📱');
    expect(brandEmoji('Celcom', 'bill')).toBe('📱');
  });

  it('recognises streaming, music and rent', () => {
    expect(brandEmoji('Netflix', 'subscription')).toBe('🎬');
    expect(brandEmoji('Spotify Family', 'subscription')).toBe('🎵');
    expect(brandEmoji('Monthly Rent', 'bill')).toBe('🏠');
  });

  it('recognises fuel, ride-hailing and shopping', () => {
    expect(brandEmoji('Petronas', 'bill')).toBe('⛽');
    expect(brandEmoji('Grab', 'bill')).toBe('🚗');
    expect(brandEmoji('Shopee', 'bnpl')).toBe('🛍️');
  });

  it('recognises income keywords', () => {
    expect(brandEmoji('Monthly Salary', 'income')).toBe('💰');
  });

  it('falls back to the type emoji when nothing matches', () => {
    expect(brandEmoji('Zzxq Untitled', 'subscription')).toBe('🔁');
    expect(brandEmoji('', 'investment')).toBe('📈');
    expect(brandEmoji('', 'creditcard')).toBe('💳');
  });
});

describe('eventEmoji', () => {
  const base: RecurringEvent = { id: '1', name: 'Netflix', type: 'subscription', amountSen: 0, freq: 'monthly' };

  it('uses the auto-detected emoji by default', () => {
    expect(eventEmoji(base)).toBe('🎬');
  });

  it('honours a user override', () => {
    expect(eventEmoji({ ...base, emoji: '🎮' })).toBe('🎮');
    // blank override falls back to auto-detect
    expect(eventEmoji({ ...base, emoji: '  ' })).toBe('🎬');
  });
});
