# SECURITY.md

> Draft — the full threat model is finalised in Phase 6. This stub records the security model the
> build is committed to from the start.

## Model

- **Local-first, client-side only.** No backend, no accounts, no cloud. Financial data never leaves
  the device. This minimises attack surface and removes server-side data-breach risk.
- **Encryption at rest.** All financial records in IndexedDB are encrypted with AES-GCM. The key is
  derived from a user passphrase via PBKDF2 (≥210,000 iterations, random per-install salt, random IV
  per record). The passphrase and raw key are never persisted. The app is locked behind the
  passphrase on open and auto-locks after inactivity.
- **No data exfiltration.** Zero runtime network calls carrying user data. A strict
  Content-Security-Policy (`default-src 'self'`, no inline scripts, no `unsafe-eval`) is enforced on
  the production build.
- **Integer-sen money** everywhere to prevent rounding/precision corruption of balances.
- **Fail closed.** Corrupt or undecryptable data is never silently wiped; recovery is via encrypted
  backup import (if enabled).

## Threat assumptions (to expand in Phase 6)

- Trusted: the user's own device and browser.
- Out of scope (current design): a compromised device / malware with the app unlocked; physical
  access while unlocked; browser zero-days.
- Backups, if exported, are encrypted; the user is responsible for storing them safely.

## Limitations

- Security depends on passphrase strength; there is no recovery if the passphrase is lost (by
  design — no backdoor).
- This is personal-use software, not audited for regulated/multi-user deployment.
