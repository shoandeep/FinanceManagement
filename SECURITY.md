# SECURITY.md

Security model, threat assumptions, and limitations for **Finance Guru** — a
local-first, single-user, client-side-only personal finance manager.

## 1. Architecture & design goals

- **Local-first, client-side only.** No backend, no accounts, no cloud, no
  telemetry. The app is static files (HTML/CSS/JS) plus the browser. Your
  financial data never leaves the device. This removes server-side breach risk and
  minimises attack surface to the local browser.
- **Encrypted at rest.** All financial records are encrypted before they touch
  IndexedDB.
- **Integer-sen money.** Every amount is stored and computed as an integer number
  of sen (1 RM = 100 sen); floating point is never used for money. This prevents
  rounding/precision corruption of balances.

## 2. Encryption at rest

| Property | Choice |
|---|---|
| Cipher | AES-GCM, 256-bit |
| Key derivation | PBKDF2-HMAC-SHA-256, **210,000 iterations** |
| Salt | 16 random bytes, generated once per install, stored in the clear (salts are not secret) |
| IV | 12 random bytes, fresh per encryption (per record / per save) |
| Key extractable? | **No** — derived `CryptoKey` is non-extractable |
| Passphrase / raw key storage | **Never persisted** — the key lives only in memory while unlocked |

- On first run the user creates a passphrase; a salt is generated and a small
  encrypted **verifier** token is stored so the passphrase can be checked on unlock.
- On unlock the key is re-derived from passphrase + salt. AES-GCM's authentication
  tag means a wrong key fails to decrypt (it cannot silently produce garbage).
- **Auto-lock**: the in-memory key is cleared after a period of inactivity (default
  5 minutes) and on explicit "Lock". Re-entry requires the passphrase.

### Fail-closed behaviour
- A **wrong passphrase** throws `WrongPassphraseError` and **never modifies or wipes
  stored data** — the encrypted records remain intact and recoverable with the
  correct passphrase.
- **Undecryptable / corrupt** data throws `CorruptDataError` rather than silently
  resetting to defaults, so a transient problem can't destroy real records.
  (Encrypted backup import is the intended recovery path — see Limitations.)

## 3. Network & content security

- **Zero runtime network calls with user data.** Nothing is transmitted anywhere.
- **Content-Security-Policy.** The production build ships a strict CSP:

  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'none'
  ```

  - `script-src 'self'` with **no `'unsafe-eval'` and no inline scripts** — the
    security-critical protection against script injection.
  - `connect-src 'self'` blocks data exfiltration to remote origins.
  - **Tradeoff:** `style-src` keeps `'unsafe-inline'` because the UI uses inline
    `style` attributes for dynamic widths (progress bars). Inline styles cannot
    execute code; with `connect-src 'self'` there is no exfiltration channel.
  - The dev server uses a slightly looser CSP (adds `ws:`/`wss:` for HMR only).

- **Self-hosting recommendation.** Some directives (`frame-ancestors`,
  `form-action`) are only enforced when CSP is delivered as an **HTTP response
  header**. When hosting the static build, also send the policy above as a
  `Content-Security-Policy` header, plus:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `X-Frame-Options: DENY`
  - HTTPS only, with HSTS.

## 4. Input handling / XSS

- The UI is React; all user-entered strings (category, goal, investment, cost
  names, notes) are rendered as text and auto-escaped. **No `dangerouslySetInnerHTML`
  is used anywhere.**
- Monetary input is parsed to integer sen and **validated** — `NaN`, infinities,
  and malformed values are rejected; negatives are rejected where invalid; percent
  inputs are clamped to 0–100.

## 5. Dependency hygiene

- Minimal, pinned (exact-version) dependencies: React, `idb`, Tailwind, Vite,
  Vitest (+ `fake-indexeddb` for tests). No money/crypto third-party libraries —
  the integer-sen helper and Web Crypto are used directly.
- `npm audit` reports **0 vulnerabilities** at the time of writing. Re-run before
  each release.

## 6. Threat model

**Trusted**
- The user's own device, OS, and browser.
- The static app bundle served to the browser.

**Mitigated**
- Loss/theft of the device while **locked** — data is encrypted; without the
  passphrase it is not readable.
- Data exfiltration by the app — no network egress; strict CSP.
- Accidental data loss from a wrong passphrase or corrupt blob — fail closed.

**Out of scope (explicitly not defended against)**
- A compromised device or malware running with the app **unlocked**, or with
  keylogging / memory scraping.
- Physical access while the app is unlocked.
- Browser or OS zero-days; a malicious browser extension with page access.
- Brute-forcing a weak passphrase (mitigated only by PBKDF2 cost + user choice).

## 7. Limitations

- Security rests on **passphrase strength**. There is **no recovery** if the
  passphrase is lost — this is by design (no backdoor, no reset that preserves data).
- Encrypted export/import for backup is part of the roadmap, not yet shipped; until
  then, `CorruptDataError` has no in-app recovery path beyond restoring the browser
  profile.
- This is personal-use software; it has not been independently audited and is not
  intended for regulated or multi-user deployment.

## 8. If a backend/sync is ever added (not in current scope)

Flag the tradeoffs first, then require: HTTPS-only; authentication; parameterised
queries (no string-built SQL); server-side validation; rate limiting; secrets in
environment variables (never in code); and end-to-end encryption so the server only
ever stores ciphertext.
