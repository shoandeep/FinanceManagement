import { test, expect } from '@playwright/test';

const PASSPHRASE = 'e2e-passphrase-123';

test('landing → save on device → net pay → log expense → persists across reload', async ({ page }) => {
  // A fresh Playwright context starts with empty IndexedDB, so this is first-run.
  await page.goto('/');

  // Landing page → choose to save on this device → create a passphrase.
  await expect(page.getByRole('heading', { name: /salary becomes/i })).toBeVisible();
  await page.getByRole('button', { name: 'Save on this device' }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE);
  await page.getByLabel('Confirm passphrase').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Create & unlock' }).click();

  // In the app (dashboard).
  await expect(page.getByText("Today's spending")).toBeVisible();

  // Enter gross pay and verify the statutory estimate + net pay.
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.getByLabel('Gross monthly pay').fill('8000');
  await expect(page.getByText('Estimate RM880.00')).toBeVisible(); // EPF 11%
  await expect(page.getByText('RM6,564.18')).toBeVisible(); // net pay

  // Log an expense; the month's expense list should reflect it.
  await page.getByRole('button', { name: 'Spend', exact: true }).click();
  await page.getByLabel('Amount').fill('50');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByText("This month's expenses (1)")).toBeVisible();

  // Reload: data is encrypted at rest; unlocking must restore it.
  await page.reload();
  await page.getByRole('button', { name: 'Unlock my saved data' }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await page.getByRole('button', { name: 'Spend', exact: true }).click();
  await expect(page.getByText("This month's expenses (1)")).toBeVisible();
});

test('guest mode is ephemeral — nothing persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();

  // Guest banner is shown (sidebar on desktop / header on mobile) and data is not saved.
  await expect(page.getByText('Guest mode — nothing is saved.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.getByLabel('Gross monthly pay').fill('8000');
  await expect(page.getByText('RM6,564.18')).toBeVisible();

  // After reload we return to the landing as a first-time user (no saved vault).
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save on this device' })).toBeVisible();
});
