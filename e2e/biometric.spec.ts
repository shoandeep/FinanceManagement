import { test, expect } from '@playwright/test';

const PASSPHRASE = 'e2e-biometric-passphrase-123';

/**
 * Exercises the full biometric (passkey/PRF) unlock flow against a Chrome
 * virtual authenticator with automatic user-verification. If the virtual
 * authenticator doesn't emit PRF, enabling fails gracefully (passphrase still
 * works) — but Chrome's CTAP2 virtual authenticator supports hmac-secret/PRF.
 */
test('set up biometric unlock, then unlock with it', async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
      isUserVerified: true,
    },
  });

  // First run: create an account with a passphrase.
  await page.goto('/');
  await page.getByRole('button', { name: 'Save on this device' }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE);
  await page.getByLabel('Confirm passphrase').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Create & unlock' }).click();
  await expect(page.getByText("Today's spending")).toBeVisible();

  // Settings → set up biometric unlock (requires the current passphrase).
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: 'Set up biometric unlock' }).click();
  await page.getByLabel('Current passphrase').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Biometric unlock is on for this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();

  // Reload → unlock with biometrics (no passphrase typed).
  await page.reload();
  await page.getByRole('button', { name: 'Unlock my saved data' }).click();
  await page.getByRole('button', { name: /Face ID \/ fingerprint/i }).click();
  await expect(page.getByText("Today's spending")).toBeVisible();
});
