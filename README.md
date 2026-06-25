# Finance Guru

Local-first, single-user, **client-side-only** personal finance & budgeting manager
for Malaysia. Takes your gross monthly pay → net pay after statutory deductions
(EPF, SOCSO, EIS, PCB) → budgeting, savings/emergency fund, investments, and a
dynamic daily spending allowance. Minimalist, fast, dark/light, mobile-first.

**Live:** https://finance-management-one-drab.vercel.app/

> **Estimates only — not financial or tax advice.** Auto-calculated net pay is an
> estimate; your payslip is the source of truth and **every deduction is
> overridable**. Always confirm statutory figures against LHDN / KWSP / PERKESO.

## Features

- **Pay → net pay.** EPF, SOCSO, EIS and PCB from gross pay, with age band and
  residency. Every line — and the final net pay — is overridable from your payslip.
- **Fixed costs & allocation.** Rent, bills, loans → disposable income, split into
  Savings / Investments / Variable by your own editable percentages.
- **Emergency fund & goals.** Target = N months of essential expenses; named goals
  with deadlines and a suggested monthly contribution; investment-pot tracking.
- **Spending plan.** A stable **average** daily / weekly / monthly allowance (an even
  split of the monthly budget, so it won't balloon late in the month) plus the
  dynamic **on-pace** figure and what's **left** per period — switchable with a
  slider, per category, with overspend and clean month rollover.
- **Encrypted & private.** AES-GCM at rest behind a passphrase; nothing leaves the
  device.

## Stack

Vite + React + TypeScript + Tailwind CSS v4. State via React context. Persistence
via IndexedDB (`idb`), **encrypted with the Web Crypto API** (AES-GCM; PBKDF2 key
derivation). No backend, no telemetry, no third-party runtime calls.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # dev server -> http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

Requires Node 20+ (developed on Node 24). First run asks you to create a passphrase
that encrypts your data on this device — there is no recovery if you lose it.

## Testing

```bash
npm test            # unit tests (Vitest)
npm run test:coverage  # coverage summary for calc + budget modules
npm run test:e2e    # Playwright happy-path E2E (needs: npx playwright install chromium)
```

- **73 unit tests** across the safety-critical modules:
  - **Calc** (`src/core`, `src/money`): EPF, SOCSO, EIS, progressive PCB, net pay —
    asserted against fixed oracles (EPF RM550, SOCSO RM29.75, EIS RM11.90, tax
    RM3,890 / rebate RM185, band boundaries, overrides). ~99% statement coverage.
  - **Crypto/vault** (`src/db`): encrypt→decrypt round-trip, wrong-passphrase fails
    closed (no wipe), no integer-sen precision drift.
  - **Budget** (`src/budget`): allocation, emergency fund, goals, dynamic daily
    spend (overspend, last day of month, month rollover).
- One **Playwright** E2E covers the happy path: create passphrase → enter pay → see
  net pay → log an expense → reload and confirm the encrypted data persists.

## Project structure

```
src/
  money/      integer-sen money helpers (parse/format/round)
  config/     statutory.ts — verified MY constants (source + effectiveDate)
  core/       pure calc: epf, socso, eis, tax (PCB), netpay
  budget/     fixed costs, allocation, emergency, goals, daily spend, dates
  db/         crypto (AES-GCM/PBKDF2), IndexedDB, vault service
  model/      persisted AppData schema + defaults
  state/      VaultContext (lock/auto-lock), deriveFinances selector
  ui/         theme, components, screens (Dashboard/Pay/Costs/Savings/Spend), AppShell
```

## Statutory figures

All EPF / SOCSO / EIS / PCB rates and brackets are baked into
[`src/config/statutory.ts`](src/config/statutory.ts) with a `source` and
`effectiveDate`, and were verified against KWSP / PERKESO / LHDN — see
[VERIFY.md](VERIFY.md). Two spec figures were corrected to official values (SOCSO
employee max RM29.75; EPF age-60+ employee 0% for citizens).

## Security

- [SECURITY.md](SECURITY.md) — model: encryption at rest, key handling, strict CSP,
  XSS hardening, fail-closed behaviour, threat model, and limitations.
- [SECURITY-REVIEW.md](SECURITY-REVIEW.md) — point-in-time evaluation (code review +
  static scan + `npm audit` + runtime CSP check): no high/critical findings; HTTP
  security headers and a stronger passphrase minimum applied.

## Build phases

1. ✅ Plan + verify statutory rates + scaffold.
2. ✅ Calc core + unit tests (integer-sen money; EPF / SOCSO / EIS / PCB / net pay).
3. ✅ Persistence + encryption (IndexedDB + Web Crypto lock screen).
4. ✅ Budget engine + tests.
5. ✅ UI (dashboard + inputs, dark/light, accessibility, overrides).
6. ✅ Harden + docs (CSP, `npm audit`, SECURITY.md, E2E happy path).
