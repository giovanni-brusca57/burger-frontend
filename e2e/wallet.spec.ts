import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

const VALID_TX_HASH = '0x' + 'a'.repeat(64);

/** Opens the Submit Tx modal — tries the direct button first, falls back to ⋯ menu. */
async function openSubmitTxModal(page: Page) {
  try {
    await page.getByRole('button', { name: /submit tx/i }).first().click({ timeout: 3000 });
  } catch {
    await page.getByRole('button', { name: /^actions$/i }).first().click();
    await page.getByRole('menuitem', { name: /submit tx/i }).click();
  }
}

/** Opens the Withdraw modal — tries the direct button first, falls back to ⋯ menu. */
async function openWithdrawModal(page: Page) {
  try {
    await page.getByRole('button', { name: /^withdraw$/i }).first().click({ timeout: 3000 });
  } catch {
    await page.getByRole('button', { name: /^actions$/i }).first().click();
    await page.getByRole('menuitem', { name: /withdraw/i }).click();
  }
}

test.describe('Wallet Page — Unauthenticated', () => {
  test('redirects to /dashboard when not logged in', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe('Wallet Page — Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/my-wallet');
    await expect(page).toHaveURL('/my-wallet', { timeout: 8000 });
    // Wait for the wallet page content to render before each test
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });
  });

  test('wallet page loads with page heading', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('available assets card is visible', async ({ page }) => {
    await expect(page.locator('main .space-y-5').first()).toBeVisible();
  });

  test('deposit history section is visible', async ({ page }) => {
    await expect(page.getByText(/history/i).first()).toBeVisible();
  });

  // ── Deposit Modal ───────────────────────────────────────────────────────

  test('deposit modal opens on Deposit button click', async ({ page }) => {
    await page.getByRole('button', { name: /^deposit$/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('deposit modal shows BEP-20 tab by default', async ({ page }) => {
    await page.getByRole('button', { name: /^deposit$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Target the tab button specifically to avoid strict mode (body also shows BEP-20)
    await expect(dialog.getByRole('button', { name: /bep.?20/i }).first()).toBeVisible();
  });

  test('deposit modal can switch to TRC-20 tab', async ({ page }) => {
    await page.getByRole('button', { name: /^deposit$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /trc.?20/i }).click();
    await expect(dialog.getByRole('button', { name: /trc.?20/i })).toBeVisible();
  });

  test('deposit modal closes on Escape key', async ({ page }) => {
    await page.getByRole('button', { name: /^deposit$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });

  // ── Submit Deposit Modal ────────────────────────────────────────────────

  test('submit tx modal opens from ⋯ menu (mobile) or Submit Tx button (desktop)', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /submit transaction/i })).toBeVisible();
  });

  test('submit tx — input is empty on open', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByPlaceholder('0x...')).toHaveValue('');
  });

  test('submit tx — button disabled when input is empty', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: /submit transaction/i })).toBeDisabled();
  });

  test('submit tx — invalid hash shows validation error on blur', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    const input = dialog.getByPlaceholder('0x...');

    await input.fill('not-a-valid-hash');
    await input.blur();

    await expect(dialog.getByText(/must be 0x followed by 64/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /submit transaction/i })).toBeDisabled();
  });

  test('submit tx — valid hash enables submit button', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');

    await dialog.getByPlaceholder('0x...').fill(VALID_TX_HASH);
    await expect(dialog.getByRole('button', { name: /submit transaction/i })).toBeEnabled();
  });

  test('submit tx — validation error clears when user corrects input', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    const input = dialog.getByPlaceholder('0x...');

    await input.fill('bad-input');
    await input.blur();
    await expect(dialog.getByText(/must be 0x followed by 64/i)).toBeVisible();

    await input.fill(VALID_TX_HASH);
    await expect(dialog.getByText(/must be 0x followed by 64/i)).not.toBeVisible();
  });

  test('submit tx — info banner mentions $30–$500 range', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/\$30/)).toBeVisible();
    await expect(dialog.getByText(/\$500/)).toBeVisible();
  });

  test('submit tx — modal closes on Escape', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });

  test('submit tx — resets to empty input on reopen', async ({ page }) => {
    await openSubmitTxModal(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('0x...').fill('0xabcdef');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 2000 });

    await openSubmitTxModal(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByPlaceholder('0x...')).toHaveValue('');
  });

  // ── Transfer Modal ──────────────────────────────────────────────────────

  test('transfer modal opens', async ({ page }) => {
    await page.getByRole('button', { name: /^transfer$/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  // ── Withdraw Modal ──────────────────────────────────────────────────────

  test('withdraw modal opens', async ({ page }) => {
    await openWithdrawModal(page);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
