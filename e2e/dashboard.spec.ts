import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads at /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('header')).toBeVisible();
  });

  test('index / redirects to /dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    // Use first() since there may be multiple elements containing "404" or "not found"
    await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  });

  test('shows rank cards — Membership tier visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Membership').first()).toBeVisible();
  });

  test('shows rank cards — all four tiers present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Membership').first()).toBeVisible();
    await expect(page.getByText('Leader').first()).toBeVisible();
    await expect(page.getByText('Gold Leader').first()).toBeVisible();
    await expect(page.getByText('Diamond Leader').first()).toBeVisible();
  });

  test('header is sticky — visible after scrolling down', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(page.locator('header')).toBeVisible();
  });

  test('bottom nav is visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    const bottomNav = page.locator('nav').last();
    await expect(bottomNav).toBeVisible();
  });

  test('language switcher button is in header on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    // Language switcher shows flag emoji + lang code in desktop header
    const langBtn = page.locator('header').getByRole('button').filter({ hasText: /🇺🇸|🇮🇩|EN|ID/i }).first();
    await expect(langBtn).toBeVisible();
  });
});
