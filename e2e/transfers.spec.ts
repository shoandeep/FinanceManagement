import { test, expect } from '@playwright/test';

/**
 * Quick-add "Save" logs a manual transfer (e.g. paycheck → a bank/e-wallet)
 * that raises that cash account's balance and leaves an editable history entry
 * under it — without leaving the capture pad.
 */
test('quick-add Save raises a cash account and logs an editable entry', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();
  const mobileNav = page.locator('nav[aria-label="Sections"]');

  // Save → Advanced → add a cash account named RYT Bank.
  await mobileNav.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('switch', { name: 'Toggle advanced cash tracking' }).click();
  await page.getByRole('button', { name: '+ Add' }).first().click(); // "Where your cash rests"
  await page.getByLabel('Account name').fill('RYT Bank');

  // Quick-add (FAB) → Save → RYT Bank auto-selected → RM500 → Save.
  await page.getByRole('button', { name: 'Quick add expense' }).click();
  const dlg = page.getByRole('dialog', { name: 'Quick add' });
  await dlg.getByRole('button', { name: 'Save', exact: true }).first().click(); // the mode chip
  await expect(dlg.getByRole('button', { name: 'RYT Bank' })).toHaveAttribute('aria-pressed', 'true');
  for (const k of ['5', '0', '0', '0', '0']) await dlg.getByRole('button', { name: k, exact: true }).click();
  await expect(dlg.getByText('RM500.00')).toBeVisible();
  await dlg.getByRole('button', { name: 'Save', exact: true }).last().click(); // primary action

  // The cash account reflects it and a transfer is logged under it.
  await expect(page.getByText('Transfers (1)')).toBeVisible();
  await expect(page.locator('input[value="500.00"]').first()).toBeVisible();

  // Expand the entry → edit fields + delete are available.
  await page.getByRole('button', { expanded: false }).filter({ hasText: '+RM500.00' }).click();
  await expect(page.getByRole('button', { name: 'Delete transfer' })).toBeVisible();

  // No horizontal overflow at mobile width.
  const overflow = await page.evaluate((vw) => {
    let count = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 0.5 || r.left < -0.5) count++;
    }
    return count;
  }, 390);
  expect(overflow).toBe(0);
});
