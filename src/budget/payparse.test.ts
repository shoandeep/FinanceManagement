import { describe, it, expect } from 'vitest';
import { parsePaymentText } from './payparse';

describe('parsePaymentText', () => {
  it('reads a bank "paid to" SMS', () => {
    const r = parsePaymentText('You have paid RM45.00 to GRAB via DuitNow on 28/06/2026. Ref 123.');
    expect(r.amountSen).toBe(4500);
    expect(r.note).toBe('GRAB');
  });

  it('reads an e-wallet receipt', () => {
    const r = parsePaymentText('Payment of RM12.50 to 7-Eleven successful.');
    expect(r.amountSen).toBe(1250);
    expect(r.note).toBe('7-Eleven');
  });

  it('reads "at <merchant>"', () => {
    const r = parsePaymentText('RM5.00 paid at ZUS Coffee');
    expect(r.amountSen).toBe(500);
    expect(r.note).toBe('ZUS Coffee');
  });

  it('handles thousands separators and names', () => {
    const r = parsePaymentText('Transfer of RM1,200.00 to John Tan completed');
    expect(r.amountSen).toBe(120_000);
    expect(r.note).toBe('John Tan');
  });

  it('prefers the grand total over sub-amounts', () => {
    const r = parsePaymentText('Subtotal RM80.00\nTax RM5.00\nTotal RM85.00\nThank you for shopping at Shopee');
    expect(r.amountSen).toBe(8500);
    expect(r.note).toBe('Shopee');
  });

  it('falls back to the share title for the merchant', () => {
    const r = parsePaymentText("You've paid RM12.50", 'Maxis');
    expect(r.amountSen).toBe(1250);
    expect(r.note).toBe('Maxis');
  });

  it('returns nothing useful for unrelated text', () => {
    expect(parsePaymentText('Hello there, how are you?')).toEqual({});
  });

  it('handles MYR and spacing', () => {
    const r = parsePaymentText('Charged MYR 30 at Petronas');
    expect(r.amountSen).toBe(3000);
    expect(r.note).toBe('Petronas');
  });
});
