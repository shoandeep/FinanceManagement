import { SCHEMA_VERSION, type AppData, type VariableCategory } from './types';

/** Generate a stable unique id (crypto.randomUUID is available in browser + Node). */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}

export function defaultVariableCategories(): VariableCategory[] {
  return [
    { id: newId(), name: 'Food & drinks', sharePercent: 40 },
    { id: newId(), name: 'Transport', sharePercent: 25 },
    { id: newId(), name: 'Entertainment', sharePercent: 15 },
    { id: newId(), name: 'Misc', sharePercent: 20 },
  ];
}

/**
 * Default app data for a fresh install. The allocation split is a neutral
 * starting point (NOT financial advice) — every number is user-editable.
 */
export function createDefaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    pay: {
      grossSen: 0,
      age: 'under60',
      residency: 'citizen',
      extraReliefsSen: 0,
      overrides: {},
    },
    fixedCosts: [],
    allocation: { base: 'disposable', savingsPct: 30, investmentsPct: 20, variablePct: 50 },
    emergencyFund: { months: 6, currentSen: 0 },
    goals: [],
    investments: [],
    variableCategories: defaultVariableCategories(),
    expenses: [],
    cashAccounts: [],
    advancedSave: false,
    recurringEvents: [],
    autoLogRecurring: true,
    materializedKeys: [],
    payPeriod: { mode: 'calendarMonth', dayOfMonth: 25, customDates: {} },
    transfers: [],
  };
}

/** Fill in any keys missing from older saved data (forward-compatible load). */
export function normalizeAppData(parsed: AppData): AppData {
  return { ...createDefaultAppData(), ...parsed };
}
