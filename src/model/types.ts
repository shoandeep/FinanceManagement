/**
 * Persisted application data model. This is the single document that is
 * serialized to JSON, encrypted, and stored in IndexedDB. All money is integer sen.
 */
import type { Age, Residency } from '../core/types';
import type { PayOverrides } from '../core/netpay';

export const SCHEMA_VERSION = 1;

export interface PayState {
  grossSen: number;
  age: Age;
  residency: Residency;
  /** Extra annual tax reliefs beyond automatic personal + EPF reliefs. */
  extraReliefsSen: number;
  /** Manual payslip overrides — the payslip is the source of truth. */
  overrides: PayOverrides;
}

export interface FixedCost {
  id: string;
  name: string;
  amountSen: number;
}

/** What the allocation percentages apply to. */
export type AllocationBase = 'net' | 'disposable';

export interface Allocation {
  base: AllocationBase;
  savingsPct: number;
  investmentsPct: number;
  variablePct: number;
}

export interface EmergencyFund {
  /** Months of essential expenses to cover. */
  months: number;
  currentSen: number;
}

export interface Goal {
  id: string;
  name: string;
  targetSen: number;
  currentSen: number;
  /** Optional deadline as an ISO date (YYYY-MM-DD). */
  deadline?: string;
}

export interface Investment {
  id: string;
  name: string;
  /** Running total contributed/held (tracking only — not advice). */
  currentSen: number;
}

export interface VariableCategory {
  id: string;
  name: string;
  /** Share of the monthly variable budget (percent; categories sum to 100). */
  sharePercent: number;
}

export interface Expense {
  id: string;
  categoryId: string;
  amountSen: number;
  /** ISO date (YYYY-MM-DD) the expense occurred. */
  dateISO: string;
  note?: string;
  /** Set when auto-created from a recurring calendar event (provenance/badge). */
  sourceEventId?: string;
}

/** Where idle (non-investment) cash rests: banks, e-wallets, fixed deposits. */
export type CashAccountType = 'bank' | 'ewallet' | 'fd';

export interface CashAccount {
  id: string;
  name: string;
  type: CashAccountType;
  balanceSen: number;
  /** Base annual interest rate (%, p.a.). */
  ratePercent: number;
  /** Optional limited-time promo rate (%, p.a.) — used while active. */
  promoRatePercent?: number;
  /** ISO date the promo rate applies until, inclusive (YYYY-MM-DD). */
  promoEnds?: string;
}

/** A recurring (or one-off) money event shown on the calendar. */
export type EventType =
  | 'income' // paycheck / money in
  | 'subscription'
  | 'savings' // auto-deposit to savings
  | 'investment' // auto-deposit / DCA
  | 'bnpl' // buy-now-pay-later instalment
  | 'creditcard' // card payment due
  | 'bill';

export type EventFreq = 'monthly' | 'weekly' | 'yearly' | 'once';

export interface RecurringEvent {
  id: string;
  name: string;
  type: EventType;
  amountSen: number;
  freq: EventFreq;
  /** monthly / yearly: 1-31 (clamped to month length). */
  dayOfMonth?: number;
  /** weekly: 0=Mon … 6=Sun. */
  weekday?: number;
  /** yearly: 1-12. */
  month?: number;
  /** once: a specific ISO date (YYYY-MM-DD). */
  dateISO?: string;
  /** Optional emoji override; blank → auto-detected from the name/type. */
  emoji?: string;
  note?: string;
}

export interface AppData {
  schemaVersion: number;
  pay: PayState;
  fixedCosts: FixedCost[];
  allocation: Allocation;
  emergencyFund: EmergencyFund;
  goals: Goal[];
  investments: Investment[];
  variableCategories: VariableCategory[];
  expenses: Expense[];
  /** Non-investment cash parked in banks/e-wallets/FDs (Advanced view in Save). */
  cashAccounts: CashAccount[];
  /** Whether the Advanced (cash & savings) view is enabled in Save. */
  advancedSave: boolean;
  /** Recurring money events for the calendar (subscriptions, income, BNPL, …). */
  recurringEvents: RecurringEvent[];
  /** Auto-log recurring outflow events into the expense ledger on their date. */
  autoLogRecurring: boolean;
  /** ISO date auto-logging was first enabled (no occurrences before it are backfilled). */
  autoLogSince?: string;
  /** Keys (`eventId:dateISO`) already auto-materialized — prevents duplicates. */
  materializedKeys: string[];
}
