/**
 * Encryption primitives (Web Crypto).
 *
 * AES-GCM (256-bit) with a key derived from the user's passphrase via PBKDF2
 * (SHA-256, >=210,000 iterations, random per-install salt). A fresh random IV is
 * generated for every record. The passphrase and the raw key are never persisted.
 */

export const PBKDF2_ITERATIONS = 210_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
const KEY_BITS = 256;

/** A stored ciphertext: base64 IV + base64 ciphertext (incl. GCM auth tag). */
export interface CipherRecord {
  iv: string;
  ct: string;
}

const subtle = (): SubtleCrypto => {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('Web Crypto API is not available in this environment');
  return c.subtle;
};

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function generateSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Derive an AES-GCM key from a passphrase + salt. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await subtle().importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false, // not extractable
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt a UTF-8 string, returning a base64 IV + ciphertext record. */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<CipherRecord> {
  const iv = randomBytes(IV_BYTES);
  const ctBuf = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ctBuf)) };
}

/**
 * Decrypt a record. Throws (GCM auth-tag failure -> OperationError) if the key is
 * wrong or the ciphertext was tampered with. Callers MUST treat a throw as
 * "could not decrypt" and must NOT wipe stored data (fail closed).
 */
export async function decryptString(key: CryptoKey, rec: CipherRecord): Promise<string> {
  const ptBuf = await subtle().decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(rec.iv) as BufferSource },
    key,
    base64ToBytes(rec.ct) as BufferSource,
  );
  return new TextDecoder().decode(ptBuf);
}
