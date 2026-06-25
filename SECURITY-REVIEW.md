# Security Evaluation — Finance Guru

**Date:** 2026-06-25 · **Scope:** full client-side application (no backend) ·
**Method:** manual code review + static pattern scan + `npm audit` + runtime CSP
verification in-browser.

This complements [SECURITY.md](SECURITY.md) (the design/threat model) with a
point-in-time evaluation of the implemented code and the live deployment.

---

## 1. Summary

The application is a **static, client-side-only** SPA with **no backend, no
network egress, and no third-party runtime calls**. Sensitive data is either kept
**in-memory only** (guest mode) or **encrypted at rest** (AES-GCM, PBKDF2) behind a
passphrase. The review found **no high or critical issues**. Two hardening actions
were applied during this evaluation (HTTP security headers + stronger passphrase
minimum). Remaining items are low-severity / informational and inherent to the
client-side, zero-knowledge design.

| # | Area | Severity | Status |
|---|------|----------|--------|
| F1 | CSP enforced only via `<meta>` (frame-ancestors/form-action ignored) | Low | **Fixed** — real HTTP headers added ([vercel.json](vercel.json)) |
| F2 | Weak passphrase allowed (min 8 chars) | Low | **Fixed** — min raised to 10 + guidance |
| F3 | `style-src 'unsafe-inline'` retained | Low / Info | Accepted (see §4) — no script execution; no exfil path |
| F4 | Offline brute-force of vault if device + ciphertext obtained | Low / By-design | Mitigated by PBKDF2 cost + passphrase strength |
| F5 | KDF is PBKDF2 (not Argon2id) | Info | Accepted — PBKDF2-SHA256 @ 210k meets OWASP; Argon2 not in Web Crypto |

---

## 2. Verified clean (evidence-based)

Static scan of `src/` for the usual sinks returned **no matches** except benign ones:

- **No `eval`, `new Function`, `document.write`.** → no script-from-string execution.
- **No `dangerouslySetInnerHTML` / `innerHTML`.** All user input (category, goal,
  cost, investment names, notes) is rendered as text and auto-escaped by React.
- **No `fetch` / `XMLHttpRequest` / WebSocket** in app code → **zero runtime network
  egress**; the only `https://` strings are source-citation comments in
  `statutory.ts`. `connect-src 'self'` blocks egress defensively regardless.
- **No external scripts/styles/fonts** in `index.html`; the only script is the
  same-origin bundled module.
- **`localStorage` / `sessionStorage`** hold only the non-sensitive **theme**
  preference — never financial data, passphrase, or keys.
- **`npm audit`: 0 vulnerabilities.** Dependencies are pinned (exact versions).
- **three.js hero** builds all geometry programmatically — **no remote assets, no
  loaders, no eval** — and is lazy-loaded/code-split.

## 3. Cryptography review

| Property | Implementation | Assessment |
|---|---|---|
| Cipher | AES-GCM, 256-bit (`src/db/crypto.ts`) | ✅ AEAD, industry standard |
| KDF | PBKDF2-HMAC-SHA-256, **210,000** iterations | ✅ meets OWASP 2023 minimum |
| Salt | 16 random bytes, per install, stored in clear | ✅ correct (salts aren't secret) |
| IV | 12 random bytes, **fresh per encryption** | ✅ no nonce reuse |
| Key | non-extractable `CryptoKey`, memory-only | ✅ never persisted/exported |
| Passphrase | never stored; verifier token used for unlock | ✅ |
| Fail-closed | wrong passphrase / corrupt blob throw, never wipe | ✅ unit-tested (`vault.test.ts`) |
| RNG | `crypto.getRandomValues` / Web Crypto | ✅ CSPRNG |

Auto-lock clears the in-memory key after 5 min idle and on explicit lock.

## 4. Content Security Policy

Production policy (now served as an **HTTP header** *and* meta):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none';
base-uri 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'none'
```

- `script-src 'self'` with **no `'unsafe-eval'`** and **no inline scripts** — the
  primary defense against script injection. Confirmed in-browser: the production
  build (and the three.js hero) run with **zero CSP violations**.
- `connect-src 'self'` — no data can be exfiltrated to remote origins.
- **F3 — `style-src 'unsafe-inline'`:** required for dynamic inline `style`
  attributes (progress-bar widths, the animated toggle, the 3D canvas). Inline
  styles cannot execute JavaScript; combined with `connect-src 'self'` and the
  absence of any untrusted-HTML rendering, there is no practical exfiltration path.
  Tightening to nonce/hash-based styles is possible but low-value here.

Companion headers (via [vercel.json](vercel.json)): `X-Content-Type-Options:
nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`,
`Permissions-Policy` (camera/mic/geo/payment denied), and HSTS.

## 5. Data handling & privacy

- **Guest mode** (default public path): data lives only in React state. Verified by
  code (`update()` persists **only** when an account key is present) and by an E2E
  test asserting nothing survives reload. Honest basis for the "No data is stored"
  claim.
- **Account mode** (opt-in): the AppData document is JSON-serialized, encrypted, and
  stored in IndexedDB. The server/host never receives it (static hosting only).
- **Integer-sen money** throughout prevents precision corruption of balances.

## 6. Client-side limitations (inherent, documented)

- **F4 — offline attack:** anyone with the unlocked device, or with the device + the
  IndexedDB ciphertext, can attempt an offline brute force. Mitigation is PBKDF2
  cost + passphrase strength only — there is no server to rate-limit. The passphrase
  minimum was raised to 10 chars (**F2**); users are guided toward multi-word
  passphrases. No recovery exists by design (no backdoor).
- **Malware / compromised browser / malicious extension** with page access while
  unlocked is out of scope (true of any local app).

## 7. Recommendations (future, optional)

1. Add an encrypted export/import for backup (currently no recovery if the device is
   lost) — flagged in SECURITY.md as roadmap.
2. Optional passphrase-strength meter (e.g. zxcvbn) — adds a dependency; weigh
   against the "minimal deps" goal.
3. If a backend/sync is ever added: keep it **end-to-end encrypted** (server stores
   ciphertext only), with parameterized queries, auth, rate limiting, server-side
   validation, and secrets in env — per SECURITY.md §8.

## 8. Conclusion

No high/critical findings. The implementation matches its stated zero-knowledge,
local-first security model; the two low-severity gaps found (header enforcement,
passphrase strength) were fixed during this review. Residual risks are inherent to
client-side encryption and are documented and mitigated.
