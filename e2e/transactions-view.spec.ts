import { test, expect } from '@playwright/test';

test('transactions view filters expenses (out) + transfers (in) @390', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();
  const nav = page.locator('nav[aria-label="Sections"]');

  // A transfer (money in): Save → Advanced → account → quick-add Save RM500.
  await nav.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('switch', { name: 'Toggle advanced cash tracking' }).click();
  await page.getByRole('button', { name: '+ Add' }).first().click();
  await page.getByLabel('Account name').fill('RYT Bank');
  await page.getByRole('button', { name: 'Quick add expense' }).click();
  const dlg = page.getByRole('dialog', { name: 'Quick add' });
  await dlg.getByRole('button', { name: 'Save', exact: true }).first().click();
  for (const k of ['5', '0', '0', '0', '0']) await dlg.getByRole('button', { name: k, exact: true }).click();
  await dlg.getByRole('button', { name: 'Save', exact: true }).last().click();

  // An expense (money out): Spend → log RM50.
  await nav.getByRole('button', { name: 'Expenses', exact: true }).click();
  const amt = page.getByPlaceholder('0.00').first();
  await amt.click();
  await amt.fill('50');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();

  // Open the full Transactions view.
  await page.getByRole('button', { name: 'View all' }).click();
  const tx = page.getByRole('dialog', { name: 'Transactions' });
  const list = tx.locator('ul');
  await expect(list.getByText('+RM500.00')).toBeVisible();
  await expect(list.getByText('−RM50.00')).toBeVisible();

  // Filter: Money in → only the transfer.
  await tx.getByRole('button', { name: 'Money in', exact: true }).click();
  await expect(list.getByText('RYT Bank').first()).toBeVisible();
  await expect(list.getByText('−RM50.00')).toHaveCount(0);

  // Filter: Money out → only the expense.
  await tx.getByRole('button', { name: 'Money out', exact: true }).click();
  await expect(list.getByText('+RM500.00')).toHaveCount(0);
  await expect(list.getByText('−RM50.00')).toBeVisible();

  // No overflow at mobile width.
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
