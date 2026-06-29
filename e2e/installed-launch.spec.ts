import { test, expect } from '@playwright/test';

const PASS = 'e2e-installed-pass-123';

// Force the app to believe it's an installed (standalone) PWA.
const forceStandalone = () => {
  const real = window.matchMedia.bind(window);
  // @ts-expect-error override for the test
  window.matchMedia = (q: string) => {
    if (typeof q === 'string' && q.includes('display-mode')) {
      return {
        matches: q.includes('standalone'),
        media: q,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false;
        },
      } as MediaQueryList;
    }
    return real(q);
  };
};

test('installed app with a saved vault skips the landing → unlock screen', async ({ page }) => {
  // Create a vault in a normal browser tab first.
  await page.goto('/');
  await page.getByRole('button', { name: 'Save on this device' }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill(PASS);
  await page.getByLabel('Confirm passphrase').fill(PASS);
  await page.getByRole('button', { name: 'Create & unlock' }).click();
  await expect(page.getByText("Today's spending")).toBeVisible();

  // Relaunch as an installed PWA.
  await page.addInitScript(forceStandalone);
  await page.reload();

  // Straight to unlock — the landing is not shown.
  await expect(page.getByRole('heading', { name: 'Unlock Finance Guru' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save on this device' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try it now — no signup' })).toHaveCount(0);
});
