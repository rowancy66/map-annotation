import { defineConfig } from 'playwright/test';

const e2eDbPath = './tmp/playwright-e2e.db';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      ...process.env,
      TURSO_DATABASE_URL: process.env.E2E_TURSO_DATABASE_URL || `file:${e2eDbPath}`,
      TURSO_AUTH_TOKEN: process.env.E2E_TURSO_AUTH_TOKEN || '',
      APP_SESSION_SECRET: process.env.E2E_APP_SESSION_SECRET || 'playwright-e2e-session-secret',
    },
  },
});
