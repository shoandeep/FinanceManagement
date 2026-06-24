import { test, expect } from '@playwright/test';

const PASSPHRASE = 'e2e-passphrase-123';

test('create vault → compute net pay → log expense → persists across reload', async ({ page }) => {
  // A fresh Playwright context starts with empty IndexedDB, so this is first-run.
  await page.goto('/');

  // First run: create a passphrase.
  await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE);
  await page.getByLabel('Confirm passphrase').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Create & unlock' }).click();

  // Unlocked: the app header is shown.
  await expect(page.getByRole('heading', { name: 'Finance Guru' })).toBeVisible();

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
  await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await page.getByRole('button', { name: 'Spend', exact: true }).click();
  await expect(page.getByText("This month's expenses (1)")).toBeVisible();
});
