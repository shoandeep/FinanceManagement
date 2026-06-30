import { test, expect } from '@playwright/test';

test('payment method: tag expenses, see breakdown + due @390', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();
  await page.locator('nav[aria-label="Sections"]').getByRole('button', { name: 'Spend', exact: true }).click();

  const logCard = page.locator('section', { hasText: 'Log an expense' });
  const addExpense = async (amount: string, method: string) => {
    const amt = page.getByPlaceholder('0.00').first();
    await amt.click();
    await amt.fill(amount);
    await logCard.getByRole('button', { name: method }).click();
    await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  };

  await addExpense('100', 'Credit');
  await addExpense('50', 'E-wallet');

  // Payment-method breakdown lists both methods with their totals.
  const breakdown = page.locator('section', { hasText: 'This month by payment method' });
  await expect(breakdown.getByText('Credit')).toBeVisible();
  await expect(breakdown.getByText('RM100.00')).toBeVisible();
  await expect(breakdown.getByText('E-wallet')).toBeVisible();

  // Expense rows carry the method emoji.
  await expect(page.getByText('💳').first()).toBeVisible();

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
