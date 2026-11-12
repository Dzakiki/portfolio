import { defineConfig, devices } from '@playwright/test';

// The checks run against a production build served the same way it will be deployed:
// under BASE_PATH (default "/portfolio", or "/" for a custom domain).
const base = (process.env.BASE_PATH || '/portfolio').replace(/\/?$/, '/');
const url = `http://localhost:4321${base}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: url, channel: 'msedge' },
  webServer: {
    command: 'npm run build && npm run preview',
    url,
    reuseExistingServer: !process.env.CI && !process.env.FRESH,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testIgnore: /poster/ },
  ],
});
