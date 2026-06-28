/**
 * Biometric (passkey) unlock via the WebAuthn PRF extension.
 *
 * A platform passkey (Face ID / fingerprint) emits a device-bound pseudo-random
 * secret (PRF) only after a successful user-verification ceremony. We derive a
 * wrapping key from that secret (HKDF→AES-GCM) and use it to encrypt the user's
 * passphrase at rest. The passphrase remains the root secret and the fallback;
 * biometrics is purely additive convenience. No network calls; no CSP changes.
 *
 * Security notes:
 *  - The PRF secret never touches disk; only the wrapped passphrase does, and it
 *    is meaningless without a fresh biometric ceremony on this device.
 *  - PRF is not universally supported (best on Android/Chrome; iOS 18+ with
 *    caveats). Everything here feature-detects and fails closed to passphrase.
 */
import {
  encryptString,
  decryptString,
  randomBytes,
  bytesToBase64,
  base64ToBytes,
  type CipherRecord,
} from './crypto';

/** A fixed, non-secret salt evaluated by the authenticator's PRF. */
const PRF_SALT = new TextEncoder().encode('finance-guru:prf:v1');
const HKDF_INFO = new TextEncoder().encode('finance-guru:biometric-kek:v1');

export interface BiometricMeta {
  credentialId: string; // base64
  wrapped: CipherRecord; // passphrase encrypted under the PRF-derived key
}

/** Whether this device exposes a user-verifying platform authenticator at all. */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false;
    const PKC = window.PublicKeyCredential as unknown as {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    };
    if (!PKC.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Derive an AES-GCM key-encryption-key from raw PRF bytes via HKDF. Pure/testable. */
export async function deriveKekFromPrf(prfBytes: ArrayBuffer | Uint8Array): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey('raw', prfBytes as BufferSource, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: HKDF_INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

type PrfResults = { enabled?: boolean; results?: { first?: ArrayBuffer } };

/**
 * Register a new platform passkey with PRF and return the credential id + the
 * PRF secret. Returns null if the platform/authenticator doesn't support PRF.
 */
export async function registerBiometric(): Promise<{ credentialId: string; prfBytes: ArrayBuffer } | null> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Finance Guru', id: window.location.hostname },
      user: { id: randomBytes(16) as BufferSource, name: 'Finance Guru', displayName: 'Finance Guru' },
      challenge: randomBytes(32) as BufferSource,
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      timeout: 60_000,
      extensions: { prf: { eval: { first: PRF_SALT as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) return null;

  const ext = cred.getClientExtensionResults() as { prf?: PrfResults };
  const credentialId = bytesToBase64(new Uint8Array(cred.rawId));

  // Some platforms return the PRF result at creation; many require a follow-up
  // assertion to actually emit it.
  if (ext.prf?.results?.first) {
    return { credentialId, prfBytes: ext.prf.results.first };
  }
  if (ext.prf?.enabled) {
    const prfBytes = await getBiometricSecret(credentialId);
    return { credentialId, prfBytes };
  }
  return null; // PRF not supported here.
}

/** Run a biometric assertion for an existing credential and return the PRF secret. */
export async function getBiometricSecret(credentialId: string): Promise<ArrayBuffer> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      allowCredentials: [{ id: base64ToBytes(credentialId) as BufferSource, type: 'public-key' }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: PRF_SALT as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Biometric assertion failed');
  const ext = assertion.getClientExtensionResults() as { prf?: PrfResults };
  const first = ext.prf?.results?.first;
  if (!first) throw new Error('This device did not return a biometric secret (PRF).');
  return first;
}

/** Encrypt the passphrase under a fresh PRF-derived key (called when enabling). */
export async function wrapPassphrase(prfBytes: ArrayBuffer, passphrase: string): Promise<CipherRecord> {
  const kek = await deriveKekFromPrf(prfBytes);
  return encryptString(kek, passphrase);
}

/** Recover the passphrase from a wrapped record using a PRF secret. */
export async function unwrapPassphrase(prfBytes: ArrayBuffer, wrapped: CipherRecord): Promise<string> {
  const kek = await deriveKekFromPrf(prfBytes);
  return decryptString(kek, wrapped);
}
