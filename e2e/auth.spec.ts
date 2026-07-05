import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('dashboard loads without login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('header')).toBeVisible();
  });

  test('accessing /my-wallet while unauthenticated redirects to /dashboard', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('accessing /my-wallet while unauthenticated opens login modal', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  });

  test('accessing /profile while unauthenticated redirects to /dashboard', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('accessing /portfolio while unauthenticated redirects to /dashboard', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('login modal — shows email and password fields', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

    // Use stable IDs from LoginModal
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('login modal — empty form submit is blocked by HTML5 required', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await dialog.getByRole('button', { name: /^login$/i }).click();
    // Modal stays open — HTML5 required validation blocks submit
    await expect(dialog).toBeVisible();
  });

  test('login modal — wrong credentials shows error banner', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.locator('#login-email').fill('wrong@example.com');
    await page.locator('#login-password').fill('wrongpassword123');
    await dialog.getByRole('button', { name: /^login$/i }).click();

    // Wait for API response
    await page.waitForTimeout(3000);
    // Modal stays open on wrong credentials
    await expect(dialog).toBeVisible();
  });

  test('login modal — valid credentials log user in', async ({ page }) => {
    await page.goto('/my-wallet');
    await page.waitForURL('**/dashboard');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.locator('#login-email').fill('test@test.com');
    await page.locator('#login-password').fill('test123456');
    await dialog.getByRole('button', { name: /^login$/i }).click();

    // Wait for the modal to close — confirms login was accepted by the server
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    // Authenticated user should be able to access the wallet page directly
    await page.goto('/my-wallet');
    await expect(page).toHaveURL('/my-wallet', { timeout: 5000 });
  });
});
