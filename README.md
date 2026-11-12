# Portfolio

Ahmad Dzaki's portfolio: an ASCII cathedral you walk through to reach an inventory of projects.

## Commands

- `npm run dev` starts a local server at http://localhost:4321/portfolio/
- `npm test` runs the unit tests
- `npm run e2e` runs the browser checks; screenshots land in `e2e-shots/`. Set `FRESH=1` to make it build and serve a production copy first, which is what to do before deploying
- `npm run poster` regenerates `public/poster.png`, the hero image shown when JavaScript is off

## How the picture is made

The cathedral is a real 3D model built in code (`src/scripts/scene3d/build.ts`) and drawn with three.js at one pixel per character, then turned into text. The camera path lives in `src/scripts/scene3d/path.ts`. The building carries no religious symbols by design; keep it that way when adding to it.

## Adding a project

Add a Markdown file to `src/content/relics/`. Copy an existing one and change the fields. `order` sets its place in the list; `relic` picks the 3D object shown for it (`cauldron`, `tome`, `owl`, `mask` or `bell`), and `relicName` and `relicWhy` are its caption. New shapes are added in `src/scripts/scene3d/relics.ts`.

## Your description

Edit `src/data/about.ts`. `tagline` is the line under your name in the hero; `bio` is the list of paragraphs at the top of the Journey tab. Set `tagline` to an empty string or `bio` to an empty list to hide it. After changing the tagline, run `npm run poster` so the link-preview image matches.

## Deploying

The site is static files. Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. In the repository's settings, Pages must be set to deploy from "GitHub Actions".

By default it builds for `https://dzakiki.github.io/portfolio`. For a custom domain:

1. In the repository settings, under Secrets and variables, Actions, Variables, add `SITE_URL` (for example `https://example.com`) and `BASE_PATH` set to `/`.
2. In the repository settings, under Pages, enter the domain and, once its certificate is issued, tick "Enforce HTTPS".
3. At the domain registrar, point the domain at GitHub Pages using the DNS records in GitHub's guide to custom domains.
4. Run `npm run poster` and commit, so the link-preview picture is current.

To check a custom-domain build locally: set `SITE_URL`, `BASE_PATH=/` and `FRESH=1`, then `npm run e2e`.

## Security

- A Content Security Policy in every page allows scripts, styles, fonts, images and connections from this site only, with a single hashed inline script. There are no third-party requests, cookies, forms, analytics or stored data.
- The policy is delivered as a `<meta>` tag because GitHub Pages cannot set response headers. If the site ever moves to a host that can, send it as a header and add `frame-ancestors 'none'`.
- `npm audit` runs in the deploy workflow and blocks a deploy on a high-severity issue in a shipped dependency.
- Do not write personal details (phone number, home address) into any file here: the repository is public.

## Offering a résumé

Put the PDF in `public/` and set `resume` in `src/data/contact.ts` to its file name. Everything in `public/` is published, so use a copy without a phone number or home address.

## Debug parameters

- `?t=4` freezes the entrance at 4 seconds
- `?s=0.65` jumps to 65% of the descent
- `?still=1` forces reduced motion

## Documents

- Design: `docs/superpowers/specs/2026-11-10-portfolio-design.md`
- Plan: `docs/superpowers/plans/2026-11-10-portfolio.md`
