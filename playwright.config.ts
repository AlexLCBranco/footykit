// e2e against `vite preview` of a fresh build: the snapshot is the recorded fixture (tests/fixtures/snapshot.json) and
// the day function answers an empty day (vite.config.ts), so no test ever calls ESPN (it refuses headless Chromium).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4190', timezoneId: 'America/Sao_Paulo', locale: 'en-US' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 911 } } }],
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4190/football/', reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
