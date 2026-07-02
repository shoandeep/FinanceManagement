# Finance Guru — Handover

_Last updated: 2026-07-02. This is a living handover; update it at the end of each working session._

## What this app is (the end goal)

A **local-first, client-side-only personal finance PWA for Malaysia** that a single user
installs and trusts with their whole money picture — and that is **publishable as a clean,
private-by-design web app**. It should track, end to end:

- **Salary → detailed budget** (Malaysian statutory deductions: EPF / SOCSO / EIS / PCB).
- **Every savings & investment vehicle** used in Malaysia: normal bank savings, **e-wallet
  FD promotions**, **bank FD promotions**, stocks / investing, and other local instruments.
- **Every payment channel**: cash, debit, e-wallet, credit, BNPL — tracked across all fields.
- **Spending by category _and_ by location** (a monthly purchase **map view** is planned).

**North star:** frictionless capture — sub-3-second, decision-free logging for fast-paced /
ADHD users. Prefer fewer taps and smart defaults over configurability.

**Non-negotiable constraints** (see `CLAUDE.md` for the full list): client-side only, no
backend, no network at runtime, strict CSP (no `unsafe-eval`, no remote fonts/scripts/images),
encrypted at rest (AES-GCM-256 / PBKDF2-210k, fail-closed), money always integer sen, escape
all user text, never move real money.

## Current status (2026-07-02)

- Last commit: `b840ab8` — "UX pass" (8 UI changes). **Committed locally, NOT pushed.**
- Tree is green: `npm run build:check` ok, 161/161 unit, 9/9 Playwright.
- **Two gates still outstanding for the UX pass:**
  1. Independent **feature-test** (did not complete last session).
  2. **Security / audit** pass (never ran) — must verify `jspdf` is eval-free & CSP-clean,
     PDF text escaping, integer-sen, no new remote/network resources.
- Do not push until the audit passes.

## Done this session (the 8 UX changes in `b840ab8`)

1. Home: removed the read-only Emergency fund card (Save screen has the fuller editable one).
2. Home: "Estimated net pay / month" is now a dark teal hero card (light-on-dark).
3. Budget: editable "RM / month" field beside `%` per allocation (back-calculates the pct).
4. Nav rename: **Pay → Salary** (users mistook it for a payment app).
5. Nav rename: **Spend → Expenses**.
6. Expenses: "Log an expense" moved above the charts/records for fast repeat entry.
7. Export: real in-app **PDF** via `jspdf@4.2.1` (lazy-loaded chunk, no eval, built-in fonts,
   no remote fetch); HTML + print kept as fallbacks.
8. Mobile: bottom-nav **safe-area insets** + `viewport-fit=cover` (no edge-touching on iPhone).

## Already implemented (broader app)

Encrypted vault + biometric unlock; installed-PWA launches straight to unlock. Salary/net-pay
with statutory deductions + payslip override. Pay-cycle budgeting, payday-on-calendar with
weekend/Malaysian-public-holiday shifting + state profile. Allocation budget (% and RM). Fixed
costs on the calendar. Cash accounts, investments, savings goals, emergency fund. Quick-add pad
+ Inbox + Web Share Target + home-screen shortcut + auto-logged recurring events. Payment-method
tracking + spend-by-method + amounts owed. Debt tracker (cards/BNPL, repayments). Filterable
Transactions view. Branded HTML + PDF export.

## Roadmap (intended order)

1. **Finish the two outstanding gates** (feature-test + security audit) for `b840ab8`, then push.
2. **Refinement / UI-UX polish FIRST** (top priority): make the **50-sen coin logo realistic**
   (must be a **self-hosted inline SVG** — remote images are CSP-forbidden), improve
   user-friendliness and visual consistency, keep everything clean and publish-ready.
3. **Core-tracking completeness for publishing:** salary→budget detail; ALL savings vehicles
   (bank savings, e-wallet FD promos, bank FD promos, stocks/investing, other MY instruments);
   ALL payment channels (cash/debit/e-wallet/credit/BNPL).
4. **Then** the monthly **purchase map view** (spend by location). ⚠️ Open design decision:
   map tiles are remote by default and collide with the strict CSP / no-network rule — resolve
   first (bundled/offline tiles vs. manual location tagging vs. a documented CSP exception)
   before building.

## Key files (see `CLAUDE.md` for the full map)

- `src/money/money.ts` — the only place money is formatted/parsed (integer sen).
- `src/model/types.ts`, `src/model/defaults.ts` — model + safe migration (`normalizeAppData`).
- `src/budget/` — pure, unit-tested logic. `src/state/selectors.ts` — `deriveFinances` view-model.
- `src/ui/AppShell.tsx` — nav/tabs. `src/ui/screens/` — the six screens. `src/export/pdf.ts` — PDF.

## Commands

- `npm run build:check` — terse build (`build ok` on success; use this, not `npm run build`).
- `npm test` (vitest) · `npm run test:e2e` (Playwright).
- Deploy = push to `main` → Vercel auto-deploy; verify live bundle hash → HTTP 200.
