import { writeFileSync } from 'node:fs';
import { test } from '@playwright/test';

/** Captures the resting cathedral, canvas only, used as the hero background when JavaScript is off. */
test('capture poster', async ({ page }) => {
  await page.goto('./?t=30&still=1');
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => (document.querySelector('#ascii') as HTMLCanvasElement).toDataURL('image/png'));
  writeFileSync('public/poster.png', Buffer.from(data.split(',')[1]!, 'base64'));
});

/** The picture shown when the link is shared: the hero with the name, at the size social sites expect. */
test('capture link preview', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('./?t=30&still=1');
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
  await page.addStyleTag({ content: '#hint, #sound, #skip, astro-dev-toolbar { display: none !important; }' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'public/og.png' });
});
