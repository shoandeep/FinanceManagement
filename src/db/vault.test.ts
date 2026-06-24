import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { DB_NAME, closeDb, vaultPut, vaultGet } from './db';
import {
  initializeVault,
  unlockVault,
  loadAppData,
  saveAppData,
  isInitialized,
  WrongPassphraseError,
  CorruptDataError,
} from './vault';
import { createDefaultAppData } from '../model/defaults';
import { bytesToBase64, randomBytes } from './crypto';

async function resetDb(): Promise<void> {
  await closeDb();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(resetDb);

describe('vault round-trip (spec 7.4)', () => {
  it('encrypt -> persist -> decrypt returns identical data', async () => {
    const key = await initializeVault('correct horse battery staple');
    const data = createDefaultAppData();
    data.pay.grossSen = 850_000;
    data.fixedCosts.push({ id: 'rent', name: 'Rent', amountSen: 150_000 });
    data.goals.push({ id: 'g1', name: 'Japan trip', targetSen: 1_200_000, currentSen: 30_000 });

    await saveAppData(key, data);
    const loaded = await loadAppData(key);
    expect(loaded).toEqual(data);
  });

  it('returns null before anything is saved, and reports initialized state', async () => {
    expect(await isInitialized()).toBe(false);
    const key = await initializeVault('pw');
    expect(await isInitialized()).toBe(true);
    expect(await loadAppData(key)).toBeNull();
  });
});

describe('wrong passphrase fails closed (spec 7.4)', () => {
  it('rejects the wrong passphrase WITHOUT wiping data', async () => {
    const key = await initializeVault('correct-passphrase');
    const data = createDefaultAppData();
    data.pay.grossSen = 500_000;
    await saveAppData(key, data);

    await expect(unlockVault('wrong-passphrase')).rejects.toBeInstanceOf(WrongPassphraseError);

    // Data is still intact and recoverable with the correct passphrase.
    const rekey = await unlockVault('correct-passphrase');
    expect(await loadAppData(rekey)).toEqual(data);
  });

  it('corrupt ciphertext throws CorruptDataError and does not clear the record', async () => {
    const key = await initializeVault('pw');
    await saveAppData(key, createDefaultAppData());

    // Tamper: overwrite the stored ciphertext with random bytes.
    await vaultPut({ iv: bytesToBase64(randomBytes(12)), ct: bytesToBase64(randomBytes(64)) });

    await expect(loadAppData(key)).rejects.toBeInstanceOf(CorruptDataError);
    // The (corrupt) record is still present — not silently deleted.
    expect(await vaultGet()).not.toBeUndefined();
  });
});

describe('integer-sen persistence has no precision drift (spec 7.4)', () => {
  it('preserves exact integer sen across repeated save/load edits', async () => {
    const key = await initializeVault('pw');
    const data = createDefaultAppData();
    data.emergencyFund.currentSen = 0;

    for (let i = 0; i < 200; i++) {
      const loaded = (await loadAppData(key)) ?? data;
      loaded.emergencyFund.currentSen += 33; // RM0.33 each cycle
      await saveAppData(key, loaded);
    }

    const final = await loadAppData(key);
    expect(final?.emergencyFund.currentSen).toBe(200 * 33);
    expect(Number.isInteger(final?.emergencyFund.currentSen)).toBe(true);
  });
});
