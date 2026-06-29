import { test, expect } from '@playwright/test';

/**
 * Quick-add "Invest" logs a manual transfer that raises the investment tracker
 * and leaves an editable history entry — without leaving the capture pad.
 */
test('quick-add Invest raises the tracker and logs an editable entry', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();
  const mobileNav = page.locator('nav[aria-label="Sections"]');

  // Save → add an investment named ASB.
  await mobileNav.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: '+ Add' }).nth(1).click(); // Investments card
  await page.getByLabel('Investment name').fill('ASB');

  // Quick-add (FAB) → Invest → RM500 → Save.
  await page.getByRole('button', { name: 'Quick add expense' }).click();
  const dlg = page.getByRole('dialog', { name: 'Quick add' });
  await dlg.getByRole('button', { name: 'Invest', exact: true }).click();
  await expect(dlg.getByRole('button', { name: 'ASB' })).toHaveAttribute('aria-pressed', 'true');
  for (const k of ['5', '0', '0', '0', '0']) await dlg.getByRole('button', { name: k, exact: true }).click();
  await expect(dlg.getByText('RM500.00')).toBeVisible();
  await dlg.getByRole('button', { name: 'Save', exact: true }).last().click(); // primary, not the mode chip

  // The tracker reflects it and a transfer is logged.
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
