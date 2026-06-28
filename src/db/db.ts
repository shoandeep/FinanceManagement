import { openDB, type IDBPDatabase } from 'idb';
import type { CipherRecord } from './crypto';
import type { BiometricMeta } from './webauthn';

export const DB_NAME = 'finance-guru';
const DB_VERSION = 1;

export const META_STORE = 'meta';
export const VAULT_STORE = 'vault';

/** Key-derivation parameters stored in the clear (salt is not secret). */
export interface KdfMeta {
  salt: string; // base64
  iterations: number;
  version: number;
}

interface Schema {
  [META_STORE]: { kdf: KdfMeta; verifier: CipherRecord; biometric: BiometricMeta };
  [VAULT_STORE]: { appdata: CipherRecord };
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
        if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE);
      },
    });
  }
  return dbPromise;
}

export async function metaGet<K extends keyof Schema[typeof META_STORE]>(
  key: K,
): Promise<Schema[typeof META_STORE][K] | undefined> {
  return (await getDb()).get(META_STORE, key as string);
}

export async function metaPut<K extends keyof Schema[typeof META_STORE]>(
  key: K,
  value: Schema[typeof META_STORE][K],
): Promise<void> {
  await (await getDb()).put(META_STORE, value, key as string);
}

export async function metaDelete(key: keyof Schema[typeof META_STORE]): Promise<void> {
  await (await getDb()).delete(META_STORE, key as string);
}

export async function vaultGet(): Promise<CipherRecord | undefined> {
  return (await getDb()).get(VAULT_STORE, 'appdata');
}

export async function vaultPut(rec: CipherRecord): Promise<void> {
  await (await getDb()).put(VAULT_STORE, rec, 'appdata');
}

/** Close + forget the connection (used by tests for isolation). */
export async function closeDb(): Promise<void> {
  if (dbPromise) {
    (await dbPromise).close();
    dbPromise = null;
  }
}
