import { test, expect } from '@playwright/test';

test('debt tracker: add a card, repay via + draws it down @390', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();
  const nav = page.locator('nav[aria-label="Sections"]');
  await nav.getByRole('button', { name: 'Spend', exact: true }).click();

  // Cards & BNPL → add a card with RM1,000 owed.
  await page.getByRole('button', { name: '+ Add' }).first().click(); // Cards & BNPL card
  await page.getByLabel('Debt name').fill('Maybank Visa');
  const owed = page.getByPlaceholder('0.00').first();
  await owed.click();
  await owed.fill('1000');
  await owed.blur();
  const debtCard = page.locator('section', { hasText: 'Total owed' });
  await expect(debtCard.getByText('RM1,000.00').first()).toBeVisible();

  // Quick-add → Repay → Maybank Visa → RM200.
  await page.getByRole('button', { name: 'Quick add expense' }).click();
  const dlg = page.getByRole('dialog', { name: 'Quick add' });
  await dlg.getByRole('button', { name: 'Repay', exact: true }).click();
  await expect(dlg.getByRole('button', { name: 'Maybank Visa' })).toHaveAttribute('aria-pressed', 'true');
  for (const k of ['2', '0', '0', '0', '0']) await dlg.getByRole('button', { name: k, exact: true }).click();
  await expect(dlg.getByText('RM200.00')).toBeVisible();
  await dlg.getByRole('button', { name: 'Save', exact: true }).last().click();

  // Balance drew down to RM800 + a repayment is logged.
  await expect(debtCard.getByText('RM800.00').first()).toBeVisible();
  await expect(page.getByText('Repayments (1)')).toBeVisible();

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
