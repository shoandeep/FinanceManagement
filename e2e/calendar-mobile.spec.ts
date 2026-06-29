import { test, expect } from '@playwright/test';

/**
 * Regression guard for mobile layout: with a cash balance set, the calendar
 * renders per-day balance-forecast pills. Those pills previously overflowed the
 * narrow month cells. Assert nothing extends past a tight 360px viewport.
 */
test('calendar balance-forecast pills stay within a 360px viewport', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it now — no signup' }).click();
  const mobileNav = page.locator('nav[aria-label="Sections"]');

  // Save → Advanced → add a cash account with a balance so the forecast renders.
  await mobileNav.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('switch', { name: 'Toggle advanced cash tracking' }).click();
  await page.getByRole('button', { name: '+ Add' }).first().click();
  const bal = page.getByPlaceholder('0.00').first();
  await bal.click();
  await bal.fill('12345');
  await bal.blur();

  await mobileNav.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'week', exact: true })).toBeVisible(); // calendar rendered

  const overflowers = await page.evaluate((vw) => {
    let count = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 0.5 || r.left < -0.5) count++;
    }
    return { count, scrollW: document.documentElement.scrollWidth };
  }, 360);

  expect(overflowers.scrollW).toBeLessThanOrEqual(360);
  expect(overflowers.count).toBe(0);
});
