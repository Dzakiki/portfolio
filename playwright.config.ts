import { defineConfig, devices } from '@playwright/test';

const slash = (s: string) => (s.endsWith('/') ? s : `${s}/`);

// By default the checks run against a production build served the same way it will be deployed:
// under BASE_PATH (default "/portfolio", or "/" for a custom domain).
// Set LIVE_URL (for example https://dzakiki.github.io/portfolio/) to check the deployed site instead.
const live = process.env.LIVE_URL ? slash(process.env.LIVE_URL) : null;
const url = live ?? `http://localhost:4321${slash(process.env.BASE_PATH || '/portfolio')}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: url, channel: 'msedge' },
  webServer: live ? undefined : {
    command: 'npm run build && npm run preview',
    url,
    reuseExistingServer: !process.env.CI && !process.env.FRESH,
    timeout: 180_000,
  },
  // the poster capture writes files for the next build, so it never runs against the live site
  testIgnore: live ? /poster/ : undefined,
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testIgnore: /poster/ },
  ],
});
