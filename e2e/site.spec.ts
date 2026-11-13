import { expect, test, type Page } from '@playwright/test';

// the address the build was made for; matches astro.config.mjs
const slash = (s: string) => (s.endsWith('/') ? s : `${s}/`);
// When LIVE_URL is set the checks run against the deployed site rather than a local build.
const LIVE = process.env.LIVE_URL ? new URL(slash(process.env.LIVE_URL)) : null;
const SITE = LIVE ? LIVE.origin : process.env.SITE_URL || 'https://dzakiki.github.io';
const BASE = LIVE ? LIVE.pathname : slash(process.env.BASE_PATH || '/portfolio');
/** Where the pages under test are served from; anything requested from elsewhere is third-party. */
const ORIGIN = LIVE ? LIVE.origin : 'http://localhost:4321';

const ready = (page: Page) => page.waitForFunction(() => document.documentElement.dataset.ready === '1');

/** Count of lit canvas samples and their mean red value (0..255). */
async function canvasStats(page: Page): Promise<{ lit: number; mean: number }> {
  return page.evaluate(() => {
    const c = document.querySelector('#ascii') as HTMLCanvasElement;
    // the canvas is WebGL, so copy it onto a 2D canvas to read its pixels
    const copy = document.createElement('canvas');
    copy.width = c.width; copy.height = c.height;
    const k = copy.getContext('2d')!;
    k.drawImage(c, 0, 0);
    const d = k.getImageData(0, 0, c.width, c.height).data;
    let lit = 0, sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { if (d[i]! > 60) lit++; sum += d[i]!; n++; }
    return { lit, mean: sum / n };
  });
}

const shot = (page: Page, name: string, project: string) =>
  page.screenshot({ path: `e2e-shots/${project}-${name}.png` });

test('mid-entrance: scene partly carved, name not yet shown', async ({ page }, info) => {
  await page.goto('./?t=4');
  await ready(page);
  await page.waitForTimeout(300);
  expect((await canvasStats(page)).lit).toBeGreaterThan(1500);
  await expect(page.locator('#hero')).toHaveCSS('opacity', '0');
  await shot(page, 'entrance', info.project.name);
});

test('hero at rest: cathedral drawn and name visible', async ({ page }, info) => {
  await page.goto('./?t=30');
  await ready(page);
  await expect(page.locator('#hero.in')).toBeVisible();
  await expect(page.locator('.name')).toHaveText('AHMAD DZAKI');
  await page.waitForTimeout(3000);
  expect((await canvasStats(page)).lit).toBeGreaterThan(3000);
  await shot(page, 'hero', info.project.name);
});

test('descent: door zoom and nave both draw', async ({ page }, info) => {
  await page.goto('./?t=30&s=0.2');
  await ready(page);
  await page.waitForTimeout(300);
  expect((await canvasStats(page)).lit).toBeGreaterThan(400);
  await shot(page, 'door', info.project.name);

  await page.goto('./?t=30&s=0.65');
  await ready(page);
  await page.waitForTimeout(300);
  expect((await canvasStats(page)).lit).toBeGreaterThan(800);
  await shot(page, 'nave', info.project.name);
});

test('no flash: canvas stays dim at every sampled moment', async ({ page }) => {
  for (const q of ['t=1', 't=3', 't=6.6', 't=7', 't=30&s=0.39', 't=30&s=0.41', 't=30&s=0.9', 't=30&s=0.94', 't=30&s=0.97']) {
    await page.goto(`./?${q}`);
    await ready(page);
    await page.waitForTimeout(200);
    expect((await canvasStats(page)).mean, q).toBeLessThan(0.4 * 255);
  }
});

test('deep link lands on the item without the entrance', async ({ page }, info) => {
  await page.goto('./#relics/tutorguru');
  await ready(page);
  await expect(page.locator('#inv.open')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TutorGuru', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Just Meal Savers' })).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await page.waitForTimeout(2500);
  await shot(page, 'inventory', info.project.name);
});

test('Journey is the first tab, and the one shown on arrival', async ({ page }) => {
  await page.goto('./?t=30&s=1');
  await ready(page);
  await expect(page.locator('#inv.open')).toBeVisible();
  await expect(page.locator('#journey')).toHaveClass(/active/);
  await expect(page.locator('.tabs a').first()).toHaveText('JOURNEY');
});

test('the tab bar is solid, marks the current tab, and stays in view while scrolling', async ({ page }) => {
  await page.goto('./#journey');
  await ready(page);
  await expect(page.locator('#inv.open')).toBeVisible();
  const bar = page.locator('.tabs');
  await expect(bar).toHaveCSS('background-color', 'rgb(10, 10, 10)');
  await expect(bar).toHaveCSS('border-top-color', 'rgb(228, 223, 211)');
  await expect(page.locator('.tabs a.on')).toHaveText('JOURNEY');
  await expect(page.locator('.tabs a.on')).toHaveCSS('background-color', 'rgb(228, 223, 211)');
  await expect(page.locator('.tabs a', { hasText: 'RELICS' })).toHaveCSS('color', 'rgb(228, 223, 211)');
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(300);
  const box = await bar.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(40);
});

test('keyboard moves between projects and tabs and updates the URL', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation is a desktop behaviour');
  await page.goto('./#relics/jms');
  await ready(page);
  await expect(page.locator('#inv.open')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/#relics\/brainrot-lms$/);
  await expect(page.getByRole('heading', { name: 'CS203 Brainrot LMS' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#attributes$/);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole('link', { name: 'github.com/Dzakiki' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/#relics\/jms$/);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/#journey$/);
});

test('relics: a turning relic on a lit plinth, chosen from four alcoves', async ({ page, isMobile }, info) => {
  await page.goto('./#relics/jms');
  await ready(page);
  await page.waitForTimeout(2200);
  const stage = page.locator('#relics pre.stage3d');
  const first = await stage.textContent();
  expect(first!.split('\n').length).toBeGreaterThanOrEqual(52);
  expect(first!.replace(/[\s.:]/g, '').length).toBeGreaterThan(200);
  await page.waitForTimeout(700);
  expect(await stage.textContent()).not.toBe(first);

  const alcoves = page.locator('#relics .alcove');
  await expect(alcoves).toHaveCount(4);
  for (const thumb of await page.locator('#relics .thumb').all()) {
    expect((await thumb.textContent())!.replace(/\s/g, '').length).toBeGreaterThan(20);
  }
  await expect(page.locator('#relics .detail.sel .ordinal')).toHaveText('RELIC I OF IV · THE CAULDRON');
  await expect(page.locator('#relics .detail.sel .why')).toHaveText('For the meals it saves.');

  // choosing another project must leave the page where it is
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => window.scrollY);
  await alcoves.nth(3).click();
  // (on a phone the text above the alcoves changes length, so the page re-anchors a little)
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(isMobile ? 260 : 4);
  await expect(page).toHaveURL(/#relics\/cs102-attendance$/);
  await expect(page.getByRole('heading', { name: 'CS102 Attendance Taking' })).toBeVisible();
  await expect(page.locator('#relics .detail.sel .ordinal')).toHaveText('RELIC IV OF IV · THE MASK');
  await page.evaluate(() => {
    const frame = document.querySelector('#relics .frame')!;
    window.scrollTo(0, window.scrollY + frame.getBoundingClientRect().top - 16);
  });
  await page.waitForTimeout(2200);
  await shot(page, 'relics', info.project.name);
});

test('journey shows every entry at once', async ({ page }, info) => {
  await page.goto('./#journey');
  await ready(page);
  await page.waitForTimeout(3000);
  for (const name of ['Backend Developer Intern', 'Bachelor of Science (Software Engineering)', 'Diploma in Information Technology', 'Logistics and Programmes']) {
    await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible();
  }
  await shot(page, 'journey', info.project.name);
});

test('contact shows the links beside a turning bell', async ({ page }, info) => {
  await page.goto('./#contact');
  await ready(page);
  await page.waitForTimeout(2500);
  await expect(page.getByRole('link', { name: 'github.com/Dzakiki' })).toBeVisible();
  const bell = await page.locator('#contact pre.relic3d').textContent();
  expect(bell!.replace(/\s/g, '').length).toBeGreaterThan(120);
  await shot(page, 'contact', info.project.name);
});

test('attributes shows every technology at once, with a large logo cycling', async ({ page, isMobile }, info) => {
  await page.goto('./#attributes');
  await ready(page);
  const tiles = page.locator('#attributes .tile');
  await expect(tiles).toHaveCount(22);
  for (const name of ['Java', 'Python', 'Keycloak', 'Docker', 'MySQL']) {
    await expect(page.locator('#attributes .tname', { hasText: new RegExp('^' + name + '$') })).toBeVisible();
  }
  await expect(page.locator('#attributes .tile[data-name="Keycloak"] .tused a')).toHaveText(['JMS', 'Brainrot LMS']);

  await page.waitForTimeout(1800);
  const altar = page.locator('#attributes .altar pre');
  expect((await altar.textContent())!.replace(/\s/g, '').length).toBeGreaterThan(40);
  const firstName = await page.locator('.altar-name').textContent();
  await page.waitForTimeout(3600);
  expect(await page.locator('.altar-name').textContent()).not.toBe(firstName);

  if (!isMobile) {
    await page.locator('#attributes .tile[data-name="Docker"]').hover();
    await expect(page.locator('.altar-name')).toHaveText('Docker');
    await page.waitForTimeout(1200);
  }
  await shot(page, 'attributes', info.project.name);
});

test('the descend prompt and sound toggle sit above the canvas and can be clicked', async ({ page }) => {
  await page.goto('./?t=30');
  await ready(page);
  for (const id of ['#hint', '#sound']) {
    await expect(page.locator(id)).toHaveCSS('position', 'fixed');
    const box = (await page.locator(id).boundingBox())!;
    const top = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('button')?.id, [box.x + box.width / 2, box.y + box.height / 2]);
    expect('#' + top).toBe(id);
  }
});

test('sound is off by default and toggles', async ({ page }) => {
  await page.goto('./?t=30');
  await ready(page);
  const btn = page.locator('#sound');
  await expect(btn).toHaveText('SOUND: OFF');
  await btn.click();
  await expect(btn).toHaveText('SOUND: ON');
  await btn.click();
  await expect(btn).toHaveText('SOUND: OFF');
});

test('reduced motion: name shows at once and content is reachable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await ready(page);
  await expect(page.locator('#hero.in')).toBeVisible();
  await page.goto('./#attributes');
  await ready(page);
  await expect(page.locator('#attributes .tname', { hasText: /^Python$/ })).toBeVisible();
});

test('the entrance plays on every load, and only a key or click skips it', async ({ page, isMobile }) => {
  await page.goto('./');
  await ready(page);
  await expect(page.locator('#hero')).not.toHaveClass(/in/);
  await expect(page.locator('#skip')).toBeVisible();

  // scrolling neither skips the entrance nor moves the page
  if (!isMobile) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(600);
    await expect(page.locator('#hero')).not.toHaveClass(/in/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
  // a bare modifier key does not skip it either
  await page.keyboard.press('Shift');
  await page.waitForTimeout(300);
  await expect(page.locator('#hero')).not.toHaveClass(/in/);

  // a real key press does, and the page can scroll again
  await page.keyboard.press('a');
  await expect(page.locator('#hero.in')).toBeVisible({ timeout: 1500 });
  await expect(page.locator('#skip')).toBeHidden();
  await expect(page.locator('html')).not.toHaveClass(/entering/);

  // it plays again on the next load
  await page.reload();
  await ready(page);
  await page.waitForTimeout(800);
  await expect(page.locator('#hero')).not.toHaveClass(/in/);
  await expect(page.locator('#hero.in')).toBeVisible({ timeout: 12_000 });
});

test('the about text appears in the hero and on the Journey tab', async ({ page }) => {
  await page.goto('./?t=30');
  await ready(page);
  await expect(page.locator('#hero .tagline')).toContainText('Dzaki (silent D)');
  await page.goto('./#journey');
  await page.reload();
  await ready(page);
  await expect(page.locator('#journey .bio p')).toHaveCount(4);
  await expect(page.locator('#journey .bio')).toContainText('Singapore Management University');
});

test('the page carries a link preview and a tab icon', async ({ page, request }) => {
  await page.goto('./');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toBe(new URL(`${BASE}og.png`, SITE).href);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Ahmad Dzaki/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  expect((await request.get('./og.png')).ok()).toBe(true);
  expect((await request.get('./favicon.svg')).ok()).toBe(true);
});

test('unknown addresses get the not-found page', async ({ page }) => {
  await page.goto('./404.html');
  await expect(page.getByRole('heading', { name: 'LOST' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the cathedral' })).toHaveAttribute('href', BASE);
});

test('security policy: only this site may load anything, and the page obeys it', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
  page.on('pageerror', e => violations.push(String(e)));
  const external: string[] = [];
  page.on('request', r => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });

  await page.goto('./?t=30');
  await ready(page);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("form-action 'none'");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).not.toContain('unsafe-eval');

  // walk the whole site so every script path runs under the policy
  await page.goto('./#relics/jms');
  await page.reload();
  await ready(page);
  await page.waitForTimeout(1500);
  for (const tab of ['ATTRIBUTES', 'CONTACT', 'JOURNEY']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    await page.waitForTimeout(700);
  }
  expect(violations).toEqual([]);
  expect(external).toEqual([]);
  // the page is alive, not a blank shell blocked by its own policy
  await expect(page.locator('#inv.open')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.classList.contains('js'))).toBe(true);
});

test('links that leave the site do not hand it a reference back', async ({ page }) => {
  await page.goto('./#contact');
  for (const a of await page.locator('a[href^="http"]').all()) {
    await expect(a).toHaveAttribute('rel', /noopener/);
  }
});

test('phone number never appears', async ({ page }) => {
  await page.goto('./');
  // any Singapore mobile number, without writing the real one into this file
  expect(await page.content()).not.toMatch(/\(\+65\)|\b[89]\d{7}\b/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all four sections are readable as a normal page', async ({ page }) => {
    await page.goto('./');
    for (const name of ['RELICS', 'JOURNEY', 'ATTRIBUTES', 'CONTACT']) {
      await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Just Meal Savers' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CS102 Attendance Taking' })).toBeVisible();
    await expect(page.locator('#ascii')).toBeHidden();
  });
});
