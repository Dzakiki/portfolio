import { defineConfig } from 'astro/config';

// Where the site is served from. The defaults suit GitHub Pages at dzakiki.github.io/portfolio.
// For a custom domain, set SITE_URL to it (for example https://example.com) and BASE_PATH to "/".
const site = process.env.SITE_URL || 'https://dzakiki.github.io';
const base = process.env.BASE_PATH || '/portfolio';

export default defineConfig({
  site,
  base,
  // Ship fonts and other small assets as files, never embedded in the stylesheet as data: URLs,
  // so the security policy can stay strict (fonts from this site only).
  vite: { build: { assetsInlineLimit: 0 } },
});
