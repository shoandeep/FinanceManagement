import { describe, it, expect } from 'vitest';
import { deriveKekFromPrf, wrapPassphrase, unwrapPassphrase } from './webauthn';

const prfA = new Uint8Array(32).fill(7);
const prfB = new Uint8Array(32).fill(9);

describe('biometric key wrapping', () => {
  it('derives a usable AES-GCM key from PRF bytes', async () => {
    const key = await deriveKekFromPrf(prfA);
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM' });
  });

  it('round-trips the passphrase with the same PRF secret', async () => {
    const pass = 'correct horse battery staple';
    const wrapped = await wrapPassphrase(prfA.buffer, pass);
    expect(wrapped).toHaveProperty('iv');
    expect(wrapped).toHaveProperty('ct');
    expect(await unwrapPassphrase(prfA.buffer, wrapped)).toBe(pass);
  });

  it('cannot unwrap with a different PRF secret (auth-tag fails)', async () => {
    const wrapped = await wrapPassphrase(prfA.buffer, 'my-secret-passphrase');
    await expect(unwrapPassphrase(prfB.buffer, wrapped)).rejects.toBeTruthy();
  });

  it('is deterministic: same PRF derives an equivalent key', async () => {
    // Wrapping with one derivation must be unwrappable by a fresh derivation.
    const wrapped = await wrapPassphrase(prfA.buffer, 'another pass phrase here');
    expect(await unwrapPassphrase(prfA.buffer, wrapped)).toBe('another pass phrase here');
  });
});
