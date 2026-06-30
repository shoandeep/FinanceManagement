# Finance Guru

Local-first, **client-side-only** personal finance PWA for Malaysia. Single user, no backend, no accounts on a server. Vite 8 + React 19 + TypeScript 6 (strict, `exactOptionalPropertyTypes`) + Tailwind v4. Installable PWA, deploys to Vercel on push to `main`.

## Hard constraints (never violate)

- **Client-side only.** No backend, no network calls at runtime. `connect-src 'self'`. No remote fonts/scripts/images ever — fonts self-hosted (Fontsource), brand "logos" are emoji.
- **Encrypted at rest.** AES-GCM-256 + PBKDF2-SHA256 (210k iters), non-extractable CryptoKey, IndexedDB via `idb`. **Fail CLOSED** on corrupt data — never silently wipe.
- **Money is always integer sen** (1 RM = 100 sen). No floats anywhere. Use `src/money/money.ts`: `formatSen`, `senFromRinggit`, type `Sen`.
- **Never move real money / execute trades.** This app only records what the user did.
- Escape user text for HTML/CSV (XSS + formula injection).
- The encryption key lives in a ref, **never** React state.

## Commands

- `npm run build:check` — terse build (only `build ok` or errors). **Use this**, not `npm run build` (that one dumps the font-asset table every time).
- `npm test` — vitest (unit). `npm run test:e2e` — Playwright.
- Build warnings go to stderr; PowerShell flags that as failure even on success. Prefer `build:check`, or check `$LASTEXITCODE`.
- Deploy = push to `main` (Vercel auto-deploy). Verify via live bundle hash → HTTP 200.

## Layout

- `src/money/money.ts` — sen helpers (the only place money is formatted/parsed).
- `src/model/` — `types.ts` (central model), `defaults.ts` (`createDefaultAppData`, `normalizeAppData` shallow-merges so new optional fields migrate safely, `newId`).
- `src/budget/` — pure, unit-tested logic. `dates.ts`, `spendingPlan.ts`, `holidays.ts` (MY national + state holidays, weekend conventions), `payperiod.ts` (payday calc, weekend/holiday shift), `transfers.ts` (`applyTransferEffect`), `transactions.ts` (`buildTransactions`/`filterTransactions`), `payments.ts` (payment methods, totals due).
- `src/state/` — `VaultContext.tsx` (views loading/landing/auth/app; sessions guest/account; standalone-launch detection; WebAuthn PRF biometric unlock), `selectors.ts` (`deriveFinances` = single view-model).
- `src/ui/` — `components.tsx` (shared `Button`, `Stat`, `Toggle`, `Select`), `QuickCapture.tsx` (the + pad: spend/save/invest/repay), `TransferLog.tsx` (shared collapsible editable history), `Transactions.tsx` (filterable modal), `Settings.tsx`, `LockScreen.tsx`, `screens/`.
- `e2e/` — Playwright specs (mobile overflow audits use a 360/390px viewport + a 0-overflow assertion).

## Conventions

- New optional model fields: add to `types.ts`, default in `createDefaultAppData`; `normalizeAppData`'s shallow merge handles migration. Guard reads with `?? []` for arrays added later.
- `exactOptionalPropertyTypes` is on: spread optionals conditionally (`...(method ? { method } : {})`), don't assign `undefined`.
- Quick-add modes map to `TransferKind`: save→`cash` (raises a cash account), invest→`investment`, repay→`debt` (lowers `DebtAccount.balanceSen`).
- Mobile-first; verify new screens at 360px (Z Fold) and 390px with the overflow assertion, not just screenshots.
- Money displayed via `formatSen`; never hand-format.

## North star

Frictionless capture: sub-3s, decision-free expense/transfer logging for fast-paced/ADHD users. Favour fewer taps and sensible defaults (e.g. remembered last payment method) over configurability.
