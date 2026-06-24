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
}
