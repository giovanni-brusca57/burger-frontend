/**
 * Mobile App Flow Tests — iPhone 14 Pro (393×852px)
 *
 * Full visual walkthrough of the mobile user journey with screenshots.
 * Run: pnpm test:e2e -- --project="Mobile Chrome" e2e/mobile-flow.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { login, TEST_USER } from './helpers';

const MOBILE_VIEWPORT = { width: 393, height: 852 };
const VALID_TX_HASH = '0x' + 'a'.repeat(64);
const INVALID_TX_HASH = '0xshort';

async function loginOnMobile(page: Page) {
  await login(page);
}

async function openSubmitTxModal(page: Page) {
  const moreBtn = page.getByRole('button', { name: /^actions$/i }).first();
  await moreBtn.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible({ timeout: 2000 });
  await menu.getByRole('menuitem', { name: /submit tx/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('Mobile App Flow', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  // ── 1. Landing ───────────────────────────────────────────────────────────

  test('1. Dashboard loads at mobile viewport', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('header')).toBeVisible();
    await page.screenshot({ path: 'test-results/flow-01-dashboard.png', fullPage: false });
  });

  test('2. No horizontal overflow on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });

  test('3. Bottom nav is visible on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('nav').last()).toBeVisible();
    await page.screenshot({ path: 'test-results/flow-02-bottom-nav.png', fullPage: false });
  });

  // ── 2. Auth redirect ─────────────────────────────────────────────────────

  test('4. /my-wallet redirects unauthenticated + opens login modal', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'test-results/flow-03-login-modal.png', fullPage: false });
  });

  test('5. Login modal fits within mobile viewport', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 2);
    }
  });

  // ── 3. Login ─────────────────────────────────────────────────────────────

  test('6. Login with valid credentials navigates to wallet', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await expect(page).toHaveURL('/my-wallet');
    await page.screenshot({ path: 'test-results/flow-04-wallet-page.png', fullPage: false });
  });

  // ── 4. Wallet page layout ────────────────────────────────────────────────

  test('7. Wallet page has no horizontal overflow', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
    await page.screenshot({ path: 'test-results/flow-05-wallet-no-overflow.png', fullPage: false });
  });

  test('8. Deposit (primary action) is visible inline on Funding Wallet row', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await expect(page.getByRole('button', { name: /^deposit$/i }).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/flow-06-wallet-actions.png', fullPage: false });
  });

  test('9. ⋯ actions menu button is visible', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await expect(page.getByRole('button', { name: /^actions$/i }).first()).toBeVisible();
  });

  test('10. ⋯ menu opens and lists secondary actions', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');

    await page.getByRole('button', { name: /^actions$/i }).first().click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible({ timeout: 2000 });

    const items = await menu.getByRole('menuitem').all();
    expect(items.length).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/flow-07-actions-menu.png', fullPage: false });
    await page.keyboard.press('Escape');
  });

  // ── 5. Deposit modal ─────────────────────────────────────────────────────

  test('11. Deposit modal opens and fits mobile viewport', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');

    await page.getByRole('button', { name: /^deposit$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 2);

    await page.screenshot({ path: 'test-results/flow-08-deposit-modal.png', fullPage: false });
  });

  test('12. Deposit modal shows BEP-20 tab by default', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await page.getByRole('button', { name: /^deposit$/i }).first().click();
    // Use role=button to avoid strict mode (BEP-20 also appears in the body text)
    await expect(page.getByRole('dialog').getByRole('button', { name: /bep.?20/i }).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/flow-09-deposit-bep20.png', fullPage: false });
  });

  // ── 6. Submit Tx modal ───────────────────────────────────────────────────

  test('13. Submit Tx opens from ⋯ menu', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await openSubmitTxModal(page);
    await page.screenshot({ path: 'test-results/flow-10-submit-tx-modal.png', fullPage: false });
  });

  test('14. Submit Tx — invalid hash shows validation error', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await openSubmitTxModal(page);

    const dialog = page.getByRole('dialog');
    const input = dialog.getByPlaceholder('0x...');
    await input.fill(INVALID_TX_HASH);
    await input.blur();

    await expect(dialog.getByText(/must be 0x followed by 64/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /submit transaction/i })).toBeDisabled();
    await page.screenshot({ path: 'test-results/flow-11-submit-invalid.png', fullPage: false });
  });

  test('15. Submit Tx — valid hash enables submit button', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await openSubmitTxModal(page);

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('0x...').fill(VALID_TX_HASH);
    await expect(dialog.getByRole('button', { name: /submit transaction/i })).toBeEnabled();
    await page.screenshot({ path: 'test-results/flow-12-submit-valid.png', fullPage: false });
  });

  // ── 7. History section ───────────────────────────────────────────────────

  test('16. Deposit history section visible after scrolling', async ({ page }) => {
    await loginOnMobile(page);
    await page.goto('/my-wallet');
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
    await expect(page.getByText(/history/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/flow-13-history.png', fullPage: false });
  });

  // ── 8. Full visual walkthrough ───────────────────────────────────────────

  test('17. Full onboarding visual walkthrough', async ({ page }) => {
    await page.goto('/dashboard');
    await page.screenshot({ path: 'test-results/walkthrough-01-dashboard.png', fullPage: false });

    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'test-results/walkthrough-02-login-prompted.png', fullPage: false });

    await page.locator('#login-email').fill(TEST_USER.email);
    await page.locator('#login-password').fill(TEST_USER.password);
    await page.screenshot({ path: 'test-results/walkthrough-03-login-filled.png', fullPage: false });

    await page.getByRole('dialog').getByRole('button', { name: /^login$/i }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'test-results/walkthrough-04-post-login.png', fullPage: false });

    await page.goto('/my-wallet');
    await page.screenshot({ path: 'test-results/walkthrough-05-wallet.png', fullPage: false });

    const depositBtn = page.getByRole('button', { name: /^deposit$/i }).first();
    if (await depositBtn.isVisible()) {
      await depositBtn.click();
      await page.screenshot({ path: 'test-results/walkthrough-06-deposit-modal.png', fullPage: false });
      await page.keyboard.press('Escape');
    }

    const moreBtn = page.getByRole('button', { name: /^actions$/i }).first();
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.screenshot({ path: 'test-results/walkthrough-07-actions-menu.png', fullPage: false });

      const menu = page.getByRole('menu');
      if (await menu.isVisible()) {
        const submitItem = menu.getByRole('menuitem', { name: /submit tx/i });
        if (await submitItem.isVisible()) {
          await submitItem.click();
          await page.screenshot({ path: 'test-results/walkthrough-08-submit-modal.png', fullPage: false });
        }
      }
    }
  });
});
