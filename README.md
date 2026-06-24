# Finance Guru

Local-first, single-user, **client-side-only** personal finance & budgeting manager for Malaysia.
Takes gross monthly pay → net pay after statutory deductions (EPF, SOCSO, EIS, PCB) → budgeting,
savings/emergency fund, investments, and a dynamic daily spending allowance.

> **Estimates only — not financial or tax advice.** Auto-calculated net pay is an estimate; your
> payslip is the source of truth and every deduction is overridable. Always confirm statutory
> figures against LHDN / KWSP / PERKESO.

## Status

Phase 1 (plan + rate verification + scaffold) complete. See [VERIFY.md](VERIFY.md) for the
statutory-rate verification and [SECURITY.md](SECURITY.md) for the security model.

## Stack

Vite + React + TypeScript + Tailwind CSS. State via React hooks/context. Persistence via IndexedDB
(`idb`), **encrypted at rest** with the Web Crypto API (AES-GCM; PBKDF2 key derivation). No backend,
no telemetry, no third-party runtime calls — financial data never leaves the device.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

Requires Node 20+ (developed on Node 24).

## Build phases

1. ✅ Plan + verify statutory rates + scaffold.
2. ⬜ Calc core + unit tests (integer-sen money; EPF / SOCSO / EIS / PCB / net pay).
3. ⬜ Persistence + encryption (IndexedDB + Web Crypto lock screen).
4. ⬜ Budget engine + tests (fixed costs, allocation, savings/emergency, dynamic daily spend).
5. ⬜ UI (dashboard + inputs, dark/light, accessibility, overrides).
6. ⬜ Harden + docs (CSP, `npm audit`, SECURITY.md, E2E happy path).

## Money

All amounts are stored and computed as **integer sen** (1 RM = 100 sen). Floating-point is never
used for money; rounding happens only at display. Currency is shown as `RM` with 2 decimals and
thousands separators.
