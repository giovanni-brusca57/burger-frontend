import { defineConfig, devices } from '@playwright/test';

const slowMo = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 700;

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  fullyParallel: false,          // run sequentially so headed window is easy to watch
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',            // always capture screenshots
    video: 'on',                 // always record video
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Headed + slow — browser window opens so you can watch every step
      name: 'chromium-watch',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: { slowMo },
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
