/**
 * Vault service: ties the crypto layer to IndexedDB.
 *
 * Security invariants:
 *  - The passphrase / raw key are never written to disk; only the derived
 *    (non-extractable) CryptoKey lives in memory while unlocked.
 *  - A wrong passphrase NEVER wipes data — it throws WrongPassphraseError and
 *    leaves every stored record untouched (fail closed).
 *  - Undecryptable/corrupt data throws rather than silently resetting.
 */
import {
  deriveKey,
  encryptString,
  decryptString,
  generateSalt,
  bytesToBase64,
  base64ToBytes,
  PBKDF2_ITERATIONS,
} from './crypto';
import { metaGet, metaPut, vaultGet, vaultPut } from './db';
import { SCHEMA_VERSION, type AppData } from '../model/types';

const VERIFIER_PLAINTEXT = 'finance-guru:verifier:v1';

export class WrongPassphraseError extends Error {
  constructor() {
    super('Incorrect passphrase');
    this.name = 'WrongPassphraseError';
  }
}

export class VaultNotInitializedError extends Error {
  constructor() {
    super('Vault has not been initialized');
    this.name = 'VaultNotInitializedError';
  }
}

export class CorruptDataError extends Error {
  constructor() {
    super('Stored data could not be decrypted or parsed');
    this.name = 'CorruptDataError';
  }
}

/** Whether a vault (KDF salt + verifier) already exists on this device. */
export async function isInitialized(): Promise<boolean> {
  return (await metaGet('kdf')) !== undefined;
}

/**
 * First-run setup: generate a salt, derive the key, store a verifier token.
 * Returns the unlocked key. Throws if a vault already exists.
 */
export async function initializeVault(passphrase: string): Promise<CryptoKey> {
  if (await isInitialized()) {
    throw new Error('Vault already initialized');
  }
  if (!passphrase) throw new Error('Passphrase required');

  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  await metaPut('kdf', {
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    version: SCHEMA_VERSION,
  });
  await metaPut('verifier', await encryptString(key, VERIFIER_PLAINTEXT));
  return key;
}

/**
 * Unlock an existing vault. Verifies the passphrase against the stored verifier.
 * Throws WrongPassphraseError on mismatch WITHOUT modifying any stored data.
 */
export async function unlockVault(passphrase: string): Promise<CryptoKey> {
  const kdf = await metaGet('kdf');
  if (!kdf) throw new VaultNotInitializedError();

  const key = await deriveKey(passphrase, base64ToBytes(kdf.salt), kdf.iterations);
  const verifier = await metaGet('verifier');
  if (!verifier) throw new VaultNotInitializedError();

  try {
    const plain = await decryptString(key, verifier);
    if (plain !== VERIFIER_PLAINTEXT) throw new WrongPassphraseError();
  } catch {
    // GCM auth-tag failure or mismatch -> wrong passphrase. Data is untouched.
    throw new WrongPassphraseError();
  }
  return key;
}

/** Load + decrypt the app data. Returns null if nothing has been saved yet. */
export async function loadAppData(key: CryptoKey): Promise<AppData | null> {
  const rec = await vaultGet();
  if (!rec) return null;
  let json: string;
  try {
    json = await decryptString(key, rec);
  } catch {
    // Fail closed: never silently discard the user's (encrypted) records.
    throw new CorruptDataError();
  }
  try {
    return JSON.parse(json) as AppData;
  } catch {
    throw new CorruptDataError();
  }
}

/** Encrypt + persist the app data under the unlocked key. */
export async function saveAppData(key: CryptoKey, data: AppData): Promise<void> {
  const rec = await encryptString(key, JSON.stringify(data));
  await vaultPut(rec);
}
