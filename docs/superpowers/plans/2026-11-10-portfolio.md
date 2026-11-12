# Portfolio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Ahmad Dzaki's portfolio: a full-screen ASCII cathedral hero, a scroll-driven descent through its door and down the nave, and a four-tab inventory holding his projects, experience, skills and contact details.

**Architecture:** A static Astro site. All content is real HTML rendered at build time from Markdown, so it reads without JavaScript. One fixed `<canvas>` sits behind it; each frame a vector scene is rasterised at one pixel per character cell, read back as brightness, passed through a chain of pure effect functions, and painted as rows of text. A `timeline` module maps time and scroll position to camera values; nothing else reads the clock or scroll.

**Tech Stack:** Astro 5, TypeScript, Vitest (unit), Playwright (browser checks), Fontsource (self-hosted fonts), Web Audio API, GitHub Pages via GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-10-portfolio-design.md`

## Global Constraints

- No full-screen flashes, strobing or rapid inversion, anywhere. The nave's end glow is capped at 35% brightness and takes at least 1.2 s.
- Colours: `--bg #0A0A0A`, `--bone #E4DFD3`, `--dim #8A867D`, `--line #3A3833`. No other hues.
- ASCII character ramp is exactly ` .:-=+*#%@`; opacity steps are 0.36, 0.58, 0.80, 1.00.
- Fonts: Cormorant Garamond 500/600, EB Garamond 400 regular/italic, JetBrains Mono 400/500, all self-hosted.
- Nothing a visitor must read is rendered as ASCII art. All ASCII art carries `aria-hidden="true"`.
- No skill bars, percentages, levels or ratings.
- The phone number never appears in page content.
- Every timed sequence can be cut short by any input.
- No 3D or WebGL library. Device pixel ratio capped at 2.
- Résumé facts must not be changed; wording may be tightened.
- Site base path is `/portfolio`; every internal URL is built from `import.meta.env.BASE_URL`.

## File Map

| File | Responsibility |
|---|---|
| `src/scripts/math.ts` | clamp, smooth, lerp, hash, easing |
| `src/scripts/timeline.ts` | Time and scroll to camera values (pure) |
| `src/scripts/grid.ts` | Character grid dimensions |
| `src/scripts/renderer.ts` | Brightness to characters; painting rows |
| `src/scripts/effects.ts` | Per-frame brightness effects, ash, crows |
| `src/scripts/perf.ts` | Frame-time sampling and grid coarsening rule |
| `src/scripts/scene/shapes.ts` | Shared vector helpers |
| `src/scripts/scene/exterior.ts` | Cathedral, skyline, moon, clouds, graveyard |
| `src/scripts/scene/nave.ts` | Interior in perspective |
| `src/scripts/sigil.ts` | Project emblem generation and animation |
| `src/scripts/inventory.ts` | Tabs, selection, keyboard, URL fragments |
| `src/scripts/audio.ts` | Synthesised sound, off by default |
| `src/scripts/hero.ts` | The frame loop; wires timeline, scenes, effects, input |
| `src/scripts/main.ts` | Boot: connects hero, inventory, audio |
| `src/content.config.ts`, `src/content/**` | Relic and journey entries |
| `src/data/attributes.ts`, `src/data/contact.ts` | Skills and contact data |
| `src/components/*.astro`, `src/pages/index.astro` | Markup |
| `src/styles/global.css` | All styling |
| `tests/*.test.ts` | Unit tests |
| `e2e/*.spec.ts` | Browser checks and poster capture |
| `.github/workflows/deploy.yml` | Deployment |

Code blocks below are preceded by a `**File:**` line naming where the block goes. Each block is the complete file.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/env.d.ts`, `src/scripts/math.ts`
- Test: `tests/math.test.ts`

**Interfaces:**
- Produces: `clamp(v, a=0, b=1)`, `smooth(v)`, `lerp(a, b, k)`, `hash(a, b)`, `easeInOutCubic(k)`; npm scripts `dev`, `build`, `preview`, `test`, `e2e`.

- [ ] **Step 1: Write config files**

**File:** `package.json`
```json
{
  "name": "portfolio",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "e2e": "playwright test",
    "poster": "playwright test e2e/poster.spec.ts"
  },
  "dependencies": {
    "@fontsource/cormorant-garamond": "^5.0.0",
    "@fontsource/eb-garamond": "^5.0.0",
    "@fontsource/jetbrains-mono": "^5.0.0",
    "astro": "^5.0.0",
    "simple-icons": "^16.37.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

**File:** `astro.config.mjs`
```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dzakiki.github.io',
  base: '/portfolio',
});
```

**File:** `tsconfig.json`
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src", "tests", "e2e"],
  "exclude": ["dist"]
}
```

**File:** `vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

**File:** `.gitignore`
```text
node_modules/
dist/
.astro/
test-results/
playwright-report/
e2e-shots/
```

**File:** `src/env.d.ts`
```ts
/// <reference types="astro/client" />
```

- [ ] **Step 2: Write the failing test**

**File:** `tests/math.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { clamp, easeInOutCubic, hash, lerp, smooth } from '../src/scripts/math';

describe('math', () => {
  it('clamps to the unit range by default', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('smooth is 0, 0.5, 1 at 0, 0.5, 1 and clamps outside', () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(0.5)).toBe(0.5);
    expect(smooth(1)).toBe(1);
    expect(smooth(-3)).toBe(0);
    expect(smooth(3)).toBe(1);
  });
  it('lerp interpolates', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
  it('hash is deterministic and within [0, 1)', () => {
    expect(hash(3, 7)).toBe(hash(3, 7));
    for (let i = 0; i < 50; i++) {
      const h = hash(i, i * 2);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  });
  it('easeInOutCubic hits its endpoints and midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
});
```

- [ ] **Step 3: Install and run the test to see it fail**

Run: `npm install` then `npm test`
Expected: FAIL, cannot resolve `../src/scripts/math`.

- [ ] **Step 4: Implement**

**File:** `src/scripts/math.ts`
```ts
export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);

export const smooth = (v: number): number => {
  const c = clamp(v);
  return c * c * (3 - 2 * c);
};

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export const easeInOutCubic = (k: number): number =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
```

- [ ] **Step 5: Run tests** — `npm test`, expected PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git init -b main
git add -A
git commit -m "chore: scaffold Astro project with math helpers"
```

---

### Task 2: Timeline

**Files:**
- Create: `src/scripts/timeline.ts`
- Test: `tests/timeline.test.ts`

**Interfaces:**
- Consumes: `clamp`, `smooth`, `lerp` from `math.ts`.
- Produces: `ENTRANCE` (`rainEnd 0.8`, `spiresEnd 2.5`, `craneEnd 6.5`, `nameAt 6.8`, `hintAt 8.7`), `CAM` (`start -40`, `rest 310`), `DESCENT_VH = 4`, `DOOR_SHARE = 0.4`, `camTop(t)`, `frontY(t)`, `roseLit(t)`, `pushIn(tSinceCrane)`, `descentProgress(scrollY, vh)`, `phases(s) -> { door, nave }`, `doorZoom(door)`, `doorFade(door)`, `naveLight(nave) -> { fadeIn, glow, out }`.

- [ ] **Step 1: Write the failing test**

**File:** `tests/timeline.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import {
  CAM, ENTRANCE, camTop, descentProgress, doorFade, doorZoom, frontY, naveLight, phases, pushIn, roseLit,
} from '../src/scripts/timeline';

describe('entrance', () => {
  it('camera starts high and rests low', () => {
    expect(camTop(0)).toBe(CAM.start);
    expect(camTop(ENTRANCE.spiresEnd)).toBe(CAM.start);
    expect(camTop(ENTRANCE.craneEnd)).toBe(CAM.rest);
    expect(camTop(99)).toBe(CAM.rest);
  });
  it('camera only ever moves downward', () => {
    let prev = camTop(0);
    for (let t = 0; t <= 8; t += 0.1) {
      expect(camTop(t)).toBeGreaterThanOrEqual(prev);
      prev = camTop(t);
    }
  });
  it('reveal front starts above the spires and ends unbounded', () => {
    expect(frontY(0)).toBe(-60);
    expect(frontY(ENTRANCE.spiresEnd)).toBeCloseTo(330);
    expect(frontY(ENTRANCE.craneEnd)).toBe(Infinity);
  });
  it('reveal front stays inside the camera view while craning', () => {
    for (let t = ENTRANCE.spiresEnd; t < ENTRANCE.craneEnd - 0.5; t += 0.1) {
      expect(frontY(t)).toBeGreaterThan(camTop(t));
    }
  });
  it('rose window lights after the crane ends', () => {
    expect(roseLit(ENTRANCE.craneEnd)).toBe(0);
    expect(roseLit(ENTRANCE.craneEnd + 0.8)).toBe(1);
  });
  it('push-in is 1 before rest and at most 4 percent', () => {
    expect(pushIn(-5)).toBe(1);
    expect(pushIn(40)).toBeCloseTo(1.04);
    expect(pushIn(400)).toBeCloseTo(1.04);
  });
});

describe('descent', () => {
  it('spans four viewport heights', () => {
    expect(descentProgress(0, 900)).toBe(0);
    expect(descentProgress(1800, 900)).toBe(0.5);
    expect(descentProgress(3600, 900)).toBe(1);
    expect(descentProgress(9999, 900)).toBe(1);
  });
  it('splits into door then nave', () => {
    expect(phases(0)).toEqual({ door: 0, nave: 0 });
    expect(phases(0.2)).toEqual({ door: 0.5, nave: 0 });
    expect(phases(0.4).door).toBe(1);
    expect(phases(0.7).nave).toBeCloseTo(0.5);
    expect(phases(1)).toEqual({ door: 1, nave: 1 });
  });
  it('door zoom is 1 at rest and about 70 at the end', () => {
    expect(doorZoom(0)).toBe(1);
    expect(doorZoom(1)).toBeGreaterThan(60);
    expect(doorZoom(1)).toBeLessThan(80);
  });
  it('door fades to black by the end of its phase', () => {
    expect(doorFade(0)).toBe(1);
    expect(doorFade(1)).toBe(0);
  });
  it('nave fades in, glows late, and ends black', () => {
    expect(naveLight(0)).toEqual({ fadeIn: 0, glow: 0, out: 1 });
    expect(naveLight(0.5)).toEqual({ fadeIn: 1, glow: 0, out: 1 });
    expect(naveLight(0.9).glow).toBe(1);
    expect(naveLight(1).out).toBe(0);
  });
  it('the glow ramp occupies at least 28 percent of the nave', () => {
    let first = 1;
    for (let n = 0; n <= 1; n += 0.01) if (naveLight(n).glow > 0) { first = n; break; }
    expect(1 - first).toBeGreaterThanOrEqual(0.27);
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, cannot resolve `timeline`.

- [ ] **Step 3: Implement**

**File:** `src/scripts/timeline.ts`
```ts
import { clamp, lerp, smooth } from './math';

/** Entrance milestones, in seconds from page start. */
export const ENTRANCE = { rainEnd: 0.8, spiresEnd: 2.5, craneEnd: 6.5, nameAt: 6.8, hintAt: 8.7 } as const;

/** Camera position: the design-space y that sits at the top of the resting view. */
export const CAM = { start: -40, rest: 310 } as const;

/** The descent occupies this many viewport heights of scroll. */
export const DESCENT_VH = 4;

/** Share of the descent spent zooming through the door; the rest is the nave. */
export const DOOR_SHARE = 0.4;

export function camTop(t: number): number {
  return lerp(CAM.start, CAM.rest, smooth((t - ENTRANCE.spiresEnd) / (ENTRANCE.craneEnd - ENTRANCE.spiresEnd)));
}

/** Design-space y of the reveal front. Everything above it is carved; Infinity once finished. */
export function frontY(t: number): number {
  if (t >= ENTRANCE.craneEnd) return Infinity;
  if (t < ENTRANCE.spiresEnd) {
    return lerp(-60, 330, smooth((t - ENTRANCE.rainEnd) / (ENTRANCE.spiresEnd - ENTRANCE.rainEnd)));
  }
  return lerp(330, 1010, smooth((t - ENTRANCE.spiresEnd) / (ENTRANCE.craneEnd - ENTRANCE.spiresEnd - 0.4)));
}

export function roseLit(t: number): number {
  return smooth((t - ENTRANCE.craneEnd) / 0.8);
}

/** Slow push-in after the camera comes to rest: up to 4% over 40 seconds. */
export function pushIn(tSinceCrane: number): number {
  return 1 + 0.04 * smooth(tSinceCrane / 40);
}

export function descentProgress(scrollY: number, vh: number): number {
  return clamp(scrollY / (DESCENT_VH * vh));
}

export function phases(s: number): { door: number; nave: number } {
  return { door: clamp(s / DOOR_SHARE), nave: clamp((s - DOOR_SHARE) / (1 - DOOR_SHARE)) };
}

export function doorZoom(door: number): number {
  return Math.exp(door * 4.3);
}

export function doorFade(door: number): number {
  return 1 - smooth((door - 0.7) / 0.3);
}

/** Nave lighting: fade in from black, a late soft glow, then out to black. */
export function naveLight(nave: number): { fadeIn: number; glow: number; out: number } {
  return {
    fadeIn: smooth(nave / 0.08),
    glow: smooth((nave - 0.72) / 0.18),
    out: 1 - smooth((nave - 0.9) / 0.1),
  };
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: timeline mapping time and scroll to camera values"`

---

### Task 3: Grid, renderer and performance rule

**Files:**
- Create: `src/scripts/grid.ts`, `src/scripts/renderer.ts`, `src/scripts/perf.ts`
- Test: `tests/renderer.test.ts`

**Interfaces:**
- Produces:
  - `interface Grid { W; H; dpr; fs; cw; ch; cols; rows; u }` (all numbers; `u` is pixels per design unit)
  - `FONT`, `fontSizeFor(W, notch)`, `unitFor(W, H)`, `makeGrid(ctx, W, H, notch): Grid`
  - `RAMP`, `ALPHAS`, `BLANK`, `charFor(b)`, `levelFor(b)`, `buildRuns(B, over, cols, row): string[]` (4 strings, one per opacity step, `''` when a step is unused), `paint(ctx, g, B, over)`
  - `nextNotch(avgMs, notch)`, `class FrameSampler { add(ms): number | null }`

- [ ] **Step 1: Write the failing test**

**File:** `tests/renderer.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { fontSizeFor, unitFor } from '../src/scripts/grid';
import { FrameSampler, nextNotch } from '../src/scripts/perf';
import { BLANK, RAMP, buildRuns, charFor, levelFor } from '../src/scripts/renderer';

describe('renderer', () => {
  it('uses the exact ramp', () => {
    expect(RAMP).toBe(' .:-=+*#%@');
  });
  it('maps brightness to characters', () => {
    expect(charFor(0)).toBe(' ');
    expect(charFor(BLANK - 0.001)).toBe(' ');
    expect(charFor(BLANK)).not.toBe(' ');
    expect(charFor(1)).toBe('@');
    expect(charFor(7)).toBe('@');
  });
  it('maps brightness to four opacity levels', () => {
    expect(levelFor(0.1)).toBe(0);
    expect(levelFor(0.3)).toBe(1);
    expect(levelFor(0.6)).toBe(2);
    expect(levelFor(0.9)).toBe(3);
  });
  it('builds one padded string per level for a row', () => {
    const B = new Float32Array([0, 0.1, 0.3, 0.6, 0.9, 0]);
    const over = new Uint8Array(6);
    const runs = buildRuns(B, over, 6, 0);
    expect(runs).toHaveLength(4);
    for (const r of runs) expect(r).toHaveLength(6);
    expect(runs[0][1]).not.toBe(' ');
    expect(runs[1][2]).not.toBe(' ');
    expect(runs[2][3]).not.toBe(' ');
    expect(runs[3][4]).not.toBe(' ');
    expect(runs[0][0]).toBe(' ');
    expect(runs[3][1]).toBe(' ');
  });
  it('returns empty strings for unused levels', () => {
    const runs = buildRuns(new Float32Array([0, 0.9]), new Uint8Array(2), 2, 0);
    expect(runs[0]).toBe('');
    expect(runs[3]).toBe(' @');
  });
  it('honours character overrides', () => {
    const over = new Uint8Array([0, 'v'.charCodeAt(0)]);
    const runs = buildRuns(new Float32Array([0, 0.9]), over, 2, 0);
    expect(runs[3]).toBe(' v');
  });
  it('reads the requested row', () => {
    const B = new Float32Array([0, 0, 0.9, 0.9]);
    expect(buildRuns(B, new Uint8Array(4), 2, 1)[3]).toBe('@@');
  });
});

describe('grid', () => {
  it('picks smaller characters on narrow screens and coarsens by notch', () => {
    expect(fontSizeFor(390, 0)).toBe(8);
    expect(fontSizeFor(1600, 0)).toBe(10);
    expect(fontSizeFor(1600, 2)).toBe(12);
  });
  it('makes the cathedral 1.45 viewports tall unless width limits it', () => {
    expect(unitFor(1600, 900)).toBeCloseTo(1.305);
    expect(unitFor(390, 844)).toBeCloseTo(390 / 700);
  });
});

describe('perf', () => {
  it('coarsens only above 24 ms and stops at notch 4', () => {
    expect(nextNotch(16, 0)).toBe(0);
    expect(nextNotch(30, 0)).toBe(1);
    expect(nextNotch(30, 4)).toBe(4);
  });
  it('reports an average once a second of samples has accumulated', () => {
    const s = new FrameSampler();
    for (let i = 0; i < 49; i++) expect(s.add(20)).toBeNull();
    expect(s.add(20)).toBeCloseTo(20);
    expect(s.add(20)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, modules missing.

- [ ] **Step 3: Implement**

**File:** `src/scripts/grid.ts`
```ts
export interface Grid {
  W: number; H: number; dpr: number;
  fs: number; cw: number; ch: number;
  cols: number; rows: number;
  /** Pixels per design unit. The scene is authored 1000 units tall. */
  u: number;
}

export const FONT = '"JetBrains Mono", monospace';

export function fontSizeFor(W: number, notch: number): number {
  return (W < 700 ? 8 : W < 1300 ? 9 : 10) + notch;
}

export function unitFor(W: number, H: number): number {
  return Math.min((H * 1.45) / 1000, W / 700);
}

export function makeGrid(ctx: CanvasRenderingContext2D, W: number, H: number, notch: number): Grid {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fs = fontSizeFor(W, notch);
  ctx.font = `${fs}px ${FONT}`;
  const cw = ctx.measureText('MMMMMMMMMM').width / 10;
  const ch = Math.round(fs * 1.3);
  return { W, H, dpr, fs, cw, ch, cols: Math.ceil(W / cw) + 1, rows: Math.ceil(H / ch) + 1, u: unitFor(W, H) };
}
```

**File:** `src/scripts/renderer.ts`
```ts
import { FONT, type Grid } from './grid';

export const RAMP = ' .:-=+*#%@';
export const ALPHAS = [0.36, 0.58, 0.8, 1] as const;
export const BLANK = 0.045;
const BONE = '228,223,211';
const BG = '#0A0A0A';

export function charFor(b: number): string {
  if (b < BLANK) return ' ';
  return RAMP[Math.min(9, 1 + ((Math.pow(Math.min(b, 1), 0.82) * 9) | 0))]!;
}

export function levelFor(b: number): 0 | 1 | 2 | 3 {
  return b < 0.2 ? 0 : b < 0.45 ? 1 : b < 0.72 ? 2 : 3;
}

/** One string per opacity level for a row; '' when that level has no glyphs. */
export function buildRuns(B: Float32Array, over: Uint8Array, cols: number, row: number): string[] {
  const parts: string[][] = [[], [], [], []];
  let used = 0;
  for (let x = 0; x < cols; x++) {
    const i = row * cols + x;
    const b = B[i]!;
    if (b < BLANK) { for (const p of parts) p.push(' '); continue; }
    const c = over[i] ? String.fromCharCode(over[i]!) : charFor(b);
    const lv = levelFor(b);
    for (let l = 0; l < 4; l++) parts[l]!.push(l === lv ? c : ' ');
    used |= 1 << lv;
  }
  return parts.map((p, l) => (used & (1 << l) ? p.join('') : ''));
}

export function paint(ctx: CanvasRenderingContext2D, g: Grid, B: Float32Array, over: Uint8Array): void {
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, g.W, g.H);
  ctx.font = `${g.fs}px ${FONT}`;
  ctx.textBaseline = 'top';
  for (let y = 0; y < g.rows; y++) {
    const runs = buildRuns(B, over, g.cols, y);
    for (let l = 0; l < 4; l++) {
      if (!runs[l]) continue;
      ctx.fillStyle = `rgba(${BONE},${ALPHAS[l]})`;
      ctx.fillText(runs[l]!, 0, y * g.ch);
    }
  }
}
```

**File:** `src/scripts/perf.ts`
```ts
/** Coarsen the character grid one notch when frames average over 24 ms. */
export function nextNotch(avgMs: number, notch: number): number {
  return avgMs > 24 && notch < 4 ? notch + 1 : notch;
}

/** Accumulates frame times; returns the average once a second's worth has been added. */
export class FrameSampler {
  private sum = 0;
  private n = 0;

  add(ms: number): number | null {
    this.sum += ms;
    this.n++;
    if (this.sum < 1000) return null;
    const avg = this.sum / this.n;
    this.sum = 0;
    this.n = 0;
    return avg;
  }
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: character grid, renderer and performance rule"`

---

### Task 4: Exterior scene

**Files:**
- Create: `src/scripts/scene/shapes.ts`, `src/scripts/scene/exterior.ts`, `tests/helpers/stub-ctx.ts`
- Test: `tests/exterior.test.ts`

**Interfaces:**
- Consumes: `Grid`; `CAM` from `timeline.ts`; `clamp`, `hash`, `lerp` from `math.ts`.
- Produces:
  - `shapes.ts`: `gray(v)`, `arch(g, x, y, w, h)`, `line(g, x1, y1, x2, y2)`, `poly(g, ...pts)`, `tree(g, x, y, len, ang, depth, seed)`
  - `exterior.ts`: `interface ExteriorView { camTop; zoom; shift; frontY; roseLit; time; mx; my }` (`mx`, `my` in -1..1), `DOOR = { x: 0, y: 840 }`, `ROSE = { x: 0, y: 470, r: 94 }`, `GROUND = 930`, `screenY(g, v, y): number`, `roseScreen(g, v): { x, y, r }`, `drawExterior(ctx, g, v): void`
  - `stubCtx(): { ctx, calls: Record<string, number>, fills: string[] }`

The geometry is ported from `docs/prototype/prototype.html` (`drawScene`), with these additions: camera pan, skyline layer, clouds, pointer parallax, and windows whose brightness depends on the reveal front.

- [ ] **Step 1: Write the test helper and failing test**

**File:** `tests/helpers/stub-ctx.ts`
```ts
/** A 2D-context stand-in that accepts any call and records what was called and which fills were set. */
export function stubCtx(): { ctx: CanvasRenderingContext2D; calls: Record<string, number>; fills: string[] } {
  const calls: Record<string, number> = {};
  const fills: string[] = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, p: string) {
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => gradient;
      return (..._args: unknown[]) => { calls[p] = (calls[p] ?? 0) + 1; };
    },
    set(_t, p: string, v: unknown) {
      if (p === 'fillStyle' && typeof v === 'string') fills.push(v);
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, fills };
}
```

**File:** `tests/exterior.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import type { Grid } from '../src/scripts/grid';
import { GROUND, ROSE, drawExterior, roseScreen, screenY, type ExteriorView } from '../src/scripts/scene/exterior';
import { CAM } from '../src/scripts/timeline';
import { stubCtx } from './helpers/stub-ctx';

const g: Grid = { W: 1600, H: 900, dpr: 1, fs: 10, cw: 6, ch: 13, cols: 268, rows: 71, u: 1.305 };
const rest: ExteriorView = { camTop: CAM.rest, zoom: 1, shift: 0, frontY: Infinity, roseLit: 1, time: 0, mx: 0, my: 0 };

describe('exterior', () => {
  it('puts design y=1000 at the bottom of the screen at rest', () => {
    expect(screenY(g, rest, 1000)).toBeCloseTo(900);
    expect(screenY(g, rest, GROUND)).toBeLessThan(900);
  });
  it('shows the spire tips at the top when the camera is at its start', () => {
    const y = screenY(g, { ...rest, camTop: CAM.start }, CAM.start);
    expect(y).toBeCloseTo(0, 0);
  });
  it('keeps the door centre fixed under zoom', () => {
    expect(screenY(g, { ...rest, zoom: 20 }, 840)).toBeCloseTo(screenY(g, rest, 840));
  });
  it('scales the rose window with zoom', () => {
    expect(roseScreen(g, { ...rest, zoom: 2 }).r).toBeCloseTo(roseScreen(g, rest).r * 2);
    expect(roseScreen(g, rest).y).toBeCloseTo(screenY(g, rest, ROSE.y));
  });
  it('draws without throwing and uses arcs and paths', () => {
    const { ctx, calls } = stubCtx();
    expect(() => drawExterior(ctx, g, rest)).not.toThrow();
    expect(calls.arc).toBeGreaterThan(5);
    expect(calls.stroke).toBeGreaterThan(50);
  });
  it('lights windows only once the reveal front has passed them', () => {
    const lit = stubCtx();
    drawExterior(lit.ctx, g, rest);
    expect(lit.fills).toContain('rgb(165,165,165)');
    const dark = stubCtx();
    drawExterior(dark.ctx, g, { ...rest, frontY: -1000, roseLit: 0 });
    expect(dark.fills).not.toContain('rgb(165,165,165)');
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, modules missing.

- [ ] **Step 3: Implement**

**File:** `src/scripts/scene/shapes.ts`
```ts
import { hash } from '../math';

type G = CanvasRenderingContext2D;

export const gray = (v: number): string => {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${c},${c},${c})`;
};

/** Pointed gothic arch path: apex at the top centre, open at the bottom. Leaves the path for fill/stroke. */
export function arch(g: G, x: number, y: number, w: number, h: number): void {
  const sh = h * 0.42;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + sh);
  g.quadraticCurveTo(x + w * 0.04, y + sh * 0.3, x + w / 2, y);
  g.quadraticCurveTo(x + w * 0.96, y + sh * 0.3, x + w, y + sh);
  g.lineTo(x + w, y + h);
}

export function line(g: G, x1: number, y1: number, x2: number, y2: number): void {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

/** Closed polygon, filled then stroked. Points are x, y pairs. */
export function poly(g: G, ...p: number[]): void {
  g.beginPath();
  g.moveTo(p[0]!, p[1]!);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!);
  g.closePath();
  g.fill();
  g.stroke();
}

export function tree(g: G, x: number, y: number, len: number, ang: number, depth: number, seed: number): void {
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  line(g, x, y, x2, y2);
  if (depth <= 0) return;
  const k = 2 + (hash(seed, depth) > 0.6 ? 1 : 0);
  for (let i = 0; i < k; i++) {
    tree(
      g, x2, y2,
      len * (0.62 + hash(seed + i, depth) * 0.16),
      ang + (i - (k - 1) / 2) * 0.75 + (hash(seed, i + depth) - 0.5) * 0.5,
      depth - 1, seed + i * 7 + 1,
    );
  }
}
```

**File:** `src/scripts/scene/exterior.ts`
```ts
import type { Grid } from '../grid';
import { clamp, hash, lerp } from '../math';
import { CAM } from '../timeline';
import { arch, gray, line, poly, tree } from './shapes';

type G = CanvasRenderingContext2D;

export interface ExteriorView {
  /** Design y at the top of the resting view; lower values look higher up the building. */
  camTop: number;
  zoom: number;
  /** Extra downward shift in pixels, used to bring the door to screen centre during the descent. */
  shift: number;
  /** Design y of the reveal front; windows below it are unlit. */
  frontY: number;
  roseLit: number;
  time: number;
  /** Pointer position, -1..1 on each axis. */
  mx: number;
  my: number;
}

export const DOOR = { x: 0, y: 840 } as const;
export const ROSE = { x: 0, y: 470, r: 94 } as const;
export const GROUND = 930;

/** Layers: how much each follows the camera pan, the zoom, and the pointer (px). */
const MOON = { pan: 0.3, zoom: 0.1, par: 12 };
const CITY = { pan: 0.6, zoom: 0.3, par: 6 };
const MAIN = { pan: 1, zoom: 1, par: 2 };

function originY(g: Grid, v: ExteriorView, pan: number): number {
  return g.H - 1000 * g.u + (CAM.rest - v.camTop) * g.u * pan + v.shift * pan;
}

/** Screen y (px) of a design y on the cathedral layer. */
export function screenY(g: Grid, v: ExteriorView, y: number): number {
  return originY(g, v, MAIN.pan) + v.my * MAIN.par * 0.5 + g.u * (DOOR.y + v.zoom * (y - DOOR.y));
}

export function roseScreen(g: Grid, v: ExteriorView): { x: number; y: number; r: number } {
  return { x: g.W / 2 + v.mx * MAIN.par, y: screenY(g, v, ROSE.y), r: (ROSE.r + 18) * g.u * v.zoom };
}

function setLayer(c: G, g: Grid, v: ExteriorView, L: { pan: number; zoom: number; par: number }): void {
  c.setTransform(g.cols / g.W, 0, 0, g.rows / g.H, 0, 0);
  c.translate(g.W / 2 + v.mx * L.par, originY(g, v, L.pan) + v.my * L.par * 0.5);
  c.scale(g.u, g.u);
  const z = 1 + (v.zoom - 1) * L.zoom;
  c.translate(0, DOOR.y);
  c.scale(z, z);
  c.translate(0, -DOOR.y);
}

export function drawExterior(c: G, g: Grid, v: ExteriorView): void {
  const lw = (g.ch * 0.85) / g.u / Math.pow(v.zoom, 0.62);
  const F = (val: number) => { c.fillStyle = gray(val); };
  const S = (val: number, w = lw) => { c.strokeStyle = gray(val); c.lineWidth = w; };
  /** Brightness of a window whose sill is at yBottom: dark until the reveal front passes it. */
  const lit = (yBottom: number, on: number) => lerp(30, on, clamp((v.frontY - yBottom) / 60));

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, g.cols, g.rows);
  c.lineJoin = 'miter';
  c.lineCap = 'butt';

  // --- moon and clouds ---
  setLayer(c, g, v, MOON);
  let rg = c.createRadialGradient(-440, 250, 170, -440, 250, 360);
  rg.addColorStop(0, gray(40));
  rg.addColorStop(1, gray(0));
  c.fillStyle = rg;
  c.beginPath(); c.arc(-440, 250, 360, 0, 7); c.fill();
  rg = c.createRadialGradient(-475, 215, 20, -440, 250, 225);
  rg.addColorStop(0, gray(126));
  rg.addColorStop(0.8, gray(98));
  rg.addColorStop(1, gray(58));
  c.fillStyle = rg;
  c.beginPath(); c.arc(-440, 250, 225, 0, 7); c.fill();
  F(70);
  for (const [cx, cy, r] of [[-520, 190, 36], [-390, 310, 52], [-545, 325, 24], [-380, 150, 20], [-460, 395, 18]] as const) {
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,0.5)';
  for (let i = 0; i < 5; i++) {
    const cx = ((hash(i, 11) * 2600 + v.time * (6 + hash(i, 12) * 8)) % 2600) - 1500;
    const cy = 110 + hash(i, 13) * 300;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.ellipse(cx + k * 95 - 95, cy + hash(i, k) * 30, 150 + hash(i, k + 3) * 80, 32 + hash(i, k + 5) * 20, 0, 0, 7);
      c.fill();
    }
  }

  // --- far city skyline ---
  setLayer(c, g, v, CITY);
  for (let i = 0; i < 48; i++) {
    const x = -1600 + i * 68 + hash(i, 1) * 40;
    const w = 44 + hash(i, 2) * 52;
    const h = 130 + hash(i, 3) * 270;
    F(15 + hash(i, 4) * 8);
    c.fillRect(x, GROUND - h, w, h);
    const peak = hash(i, 5) < 0.45 ? 50 + hash(i, 6) * 150 : 24;
    c.beginPath();
    c.moveTo(x - 3, GROUND - h);
    c.lineTo(x + w / 2, GROUND - h - peak);
    c.lineTo(x + w + 3, GROUND - h);
    c.closePath();
    c.fill();
    if (hash(i, 7) < 0.35) { F(64); c.fillRect(x + w * 0.35, GROUND - h * (0.4 + hash(i, 8) * 0.4), 9, 14); }
  }

  // --- graveyard and trees ---
  setLayer(c, g, v, MAIN);
  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (580 + (i >> 1) * 58 + hash(i, 3) * 30);
    const hgt = 30 + hash(i, 7) * 50;
    const w = 24 + hash(i, 9) * 14;
    F(40); S(140, lw * 0.8);
    if (hash(i, 5) < 0.4) {
      line(c, x, GROUND, x, GROUND - hgt - 28);
      line(c, x - w * 0.6, GROUND - hgt, x + w * 0.6, GROUND - hgt);
    } else {
      arch(c, x - w / 2, GROUND - hgt, w, hgt); c.fill(); c.stroke();
    }
  }
  S(95, lw * 0.55);
  tree(c, 880, GROUND, 170, -Math.PI / 2 - 0.08, 3, 11);
  tree(c, -930, GROUND, 140, -Math.PI / 2 + 0.12, 3, 29);
  S(85, lw * 0.6);
  line(c, -2600, GROUND, -530, GROUND);
  line(c, 530, GROUND, 2600, GROUND);

  // --- towers and aisles, mirrored ---
  for (const sgn of [-1, 1]) {
    c.save();
    c.scale(sgn, 1);
    F(34); S(145);
    poly(c, 270, 930, 270, 610, 490, 682, 490, 930);
    poly(c, 490, 930, 490, 722, 509, 618, 528, 722, 528, 930);
    S(120, lw * 0.7);
    line(c, 276, 520, 494, 700);
    for (const wx of [298, 364, 430]) {
      F(lit(882, 140)); arch(c, wx, 742, 40, 140); c.fill();
      S(210, lw * 0.7); c.stroke();
    }
    F(44); S(195);
    c.beginPath(); c.rect(120, 300, 150, 630); c.fill(); c.stroke();
    F(34);
    poly(c, 108, 300, 195, 40, 282, 300);
    S(220, lw * 0.7);
    line(c, 195, 40, 195, 6);
    line(c, 181, 22, 209, 22);
    F(34); S(195);
    for (const px of [120, 270]) poly(c, px - 14, 300, px, 212, px + 14, 300);
    S(225, lw * 0.7);
    for (const wx of [150, 206]) {
      F(lit(480, 165)); arch(c, wx, 350, 34, 130); c.fill(); c.stroke();
      F(lit(620, 165)); arch(c, wx, 512, 34, 108); c.fill(); c.stroke();
    }
    S(150, lw * 0.7);
    line(c, 120, 640, 270, 640);
    line(c, 120, 760, 270, 760);
    F(lit(726, 150)); S(215, lw * 0.6);
    c.beginPath(); c.arc(195, 700, 26, 0, 7); c.fill(); c.stroke();
    F(0); S(195);
    arch(c, 164, 798, 62, 132); c.fill(); c.stroke();
    c.restore();
  }

  // --- central bay, gable, rose window ---
  F(40); S(195);
  c.beginPath(); c.rect(-120, 340, 240, 590); c.fill(); c.stroke();
  F(34);
  poly(c, -134, 340, 0, 172, 134, 340);
  S(228, lw * 0.7);
  line(c, 0, 172, 0, 118);
  line(c, -18, 142, 18, 142);

  rg = c.createRadialGradient(0, ROSE.y, 6, 0, ROSE.y, ROSE.r);
  rg.addColorStop(0, gray(lerp(40, 255, v.roseLit)));
  rg.addColorStop(1, gray(lerp(30, 150, v.roseLit)));
  c.fillStyle = rg;
  c.beginPath(); c.arc(0, ROSE.y, ROSE.r, 0, 7); c.fill();
  S(22, lw * 0.42);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + 0.26;
    line(c, Math.cos(a) * 22, ROSE.y + Math.sin(a) * 22, Math.cos(a) * 88, ROSE.y + Math.sin(a) * 88);
  }
  c.beginPath(); c.arc(0, ROSE.y, 54, 0, 7); c.stroke();
  S(255);
  c.beginPath(); c.arc(0, ROSE.y, ROSE.r, 0, 7); c.stroke();
  F(lerp(60, 255, v.roseLit));
  c.beginPath(); c.arc(0, ROSE.y, 16, 0, 7); c.fill();

  F(lit(652, 125));
  for (let i = 0; i < 7; i++) { arch(c, -104 + i * 31, 592, 22, 60); c.fill(); }
  S(150, lw * 0.7);
  line(c, -120, 578, 120, 578);
  line(c, -120, 668, 120, 668);

  // --- great portal and steps ---
  S(130);
  arch(c, -98, 690, 196, 240); c.stroke();
  F(0); S(245);
  arch(c, -66, 724, 132, 206); c.fill(); c.stroke();
  S(110, lw * 0.7);
  line(c, -152, 940, 152, 940);
  line(c, -204, 955, 204, 955);
  line(c, -258, 971, 258, 971);
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: exterior cathedral scene with skyline, clouds and lit windows"`

---

### Task 5: Effects

**Files:**
- Create: `src/scripts/effects.ts`
- Test: `tests/effects.test.ts`

**Interfaces:**
- Consumes: `Grid`, `RAMP`, `clamp`, `smooth`.
- Produces:
  - `interface Frame { g; B: Float32Array; over: Uint8Array; noise; colA; colB; colC }`, `makeFrame(g, rnd?)`, `clear(f)`
  - `fromImage(f, data)`, `stars(f, groundRow, time)`, `flicker(f, rose, time)`, `rays(f, rose, lit, time)`, `fog(f, groundRow, k, time)`, `lantern(f, lx, ly)`, `nameBand(f, k)`, `scale(f, k)`, `glow(f, k)`, `reveal(f, frontRow, t, rnd?)`, `edgeColumns(f, k)`
  - `class Ash { constructor(g, count, rnd?); step(dt, time, g); stamp(f, brightness) }`
  - `class Crows { readonly count; launch(g, n, rnd?); step(dt, g); stamp(f, time) }`
  - `GLOW_MAX = 0.35`

- [ ] **Step 1: Write the failing test**

**File:** `tests/effects.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import {
  Ash, Crows, GLOW_MAX, clear, edgeColumns, fromImage, glow, lantern, makeFrame, nameBand, reveal, scale,
} from '../src/scripts/effects';
import type { Grid } from '../src/scripts/grid';

const g: Grid = { W: 120, H: 130, dpr: 1, fs: 10, cw: 6, ch: 13, cols: 20, rows: 10, u: 0.2 };
const half = () => 0.5;
const frame = (fill = 0.5) => { const f = makeFrame(g, half); f.B.fill(fill); return f; };

describe('effects', () => {
  it('fromImage reads the red channel and leaves black cells black', () => {
    const f = makeFrame(g, half);
    const data = new Uint8ClampedArray(g.cols * g.rows * 4);
    data[0] = 255;
    fromImage(f, data);
    expect(f.B[0]).toBeCloseTo(1);
    expect(f.B[1]).toBe(0);
  });
  it('scale multiplies every cell', () => {
    const f = frame();
    scale(f, 0.5);
    expect(f.B[7]).toBeCloseTo(0.25);
  });
  it('glow never exceeds the cap, from above or below', () => {
    const dark = frame(0); glow(dark, 1);
    const bright = frame(1); glow(bright, 1);
    for (const v of [...dark.B, ...bright.B]) expect(v).toBeLessThanOrEqual(GLOW_MAX + 1e-6);
    expect(Math.max(...dark.B)).toBeGreaterThan(0.2);
  });
  it('glow at zero changes nothing', () => {
    const f = frame(0.9); glow(f, 0);
    expect(f.B[0]).toBeCloseTo(0.9);
  });
  it('lantern is brighter at its centre than far away', () => {
    const f = frame();
    lantern(f, 0, 0);
    expect(f.B[0]).toBeGreaterThan(f.B[g.cols * g.rows - 1]!);
  });
  it('nameBand dims rows around 66 percent height only', () => {
    const f = frame();
    nameBand(f, 1);
    const rowAt = (frac: number) => Math.round((frac * g.H) / g.ch) * g.cols;
    expect(f.B[rowAt(0.66)]).toBeLessThan(0.35);
    expect(f.B[0]).toBeCloseTo(0.5);
  });
  it('reveal keeps cells above the front and hides cells below it', () => {
    const f = frame();
    reveal(f, 5, 0, half);
    expect(f.B[0]).toBeCloseTo(0.5);
    const below = 9 * g.cols + 3;
    expect(f.B[below]).toBeLessThan(0.86);
    let hidden = 0;
    for (let x = 0; x < g.cols; x++) if (f.B[9 * g.cols + x] === 0) hidden++;
    expect(hidden).toBeGreaterThan(0);
  });
  it('edgeColumns lights only cells near the left and right edges', () => {
    const f = frame(0);
    edgeColumns(f, 1);
    expect(f.B[0]).toBeGreaterThan(0);
    expect(f.B[g.cols - 1]).toBeGreaterThan(0);
    expect(f.B[10]).toBe(0);
  });
  it('clear zeroes brightness and overrides', () => {
    const f = frame(); f.over.fill(65);
    clear(f);
    expect(Math.max(...f.B)).toBe(0);
    expect(Math.max(...f.over)).toBe(0);
  });
  it('ash stamps characters into the frame', () => {
    const f = frame(0);
    const ash = new Ash(g, 5, half);
    ash.stamp(f, 0.7);
    expect(Math.max(...f.over)).toBeGreaterThan(0);
    expect(Math.max(...f.B)).toBeCloseTo(0.7);
  });
  it('crows launch, fly, and leave the screen', () => {
    const crows = new Crows();
    crows.launch(g, 6, half);
    expect(crows.count).toBe(6);
    for (let i = 0; i < 200; i++) crows.step(0.1, g);
    expect(crows.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, module missing.

- [ ] **Step 3: Implement**

**File:** `src/scripts/effects.ts`
```ts
import type { Grid } from './grid';
import { clamp, smooth } from './math';
import { RAMP } from './renderer';

export interface Frame {
  g: Grid;
  /** Brightness per cell, 0..1. */
  B: Float32Array;
  /** Character override per cell (char code), 0 for none. */
  over: Uint8Array;
  /** Static per-cell and per-column random values. */
  noise: Float32Array;
  colA: Float32Array;
  colB: Float32Array;
  colC: Float32Array;
}

type Circle = { x: number; y: number; r: number };

/** The nave's end glow never lifts a cell above this. */
export const GLOW_MAX = 0.35;

export function makeFrame(g: Grid, rnd: () => number = Math.random): Frame {
  const n = g.cols * g.rows;
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rnd();
  const col = () => {
    const a = new Float32Array(g.cols);
    for (let x = 0; x < g.cols; x++) a[x] = rnd();
    return a;
  };
  return { g, B: new Float32Array(n), over: new Uint8Array(n), noise, colA: col(), colB: col(), colC: col() };
}

export function clear(f: Frame): void {
  f.B.fill(0);
  f.over.fill(0);
}

/** Load brightness from an RGBA image one pixel per cell, adding stone grain to non-black cells. */
export function fromImage(f: Frame, data: Uint8ClampedArray): void {
  const { B, noise } = f;
  for (let i = 0; i < B.length; i++) {
    let b = data[i * 4]! / 255;
    if (b > 0.02) b += (noise[i]! - 0.5) * 0.11;
    B[i] = b;
  }
  f.over.fill(0);
}

export function stars(f: Frame, groundRow: number, time: number): void {
  const { g, B, noise } = f;
  const last = Math.min(g.rows, Math.floor(groundRow - 4));
  for (let y = 0; y < last; y++) {
    for (let x = 0; x < g.cols; x++) {
      const i = y * g.cols + x;
      if (B[i]! <= 0.02 && noise[i]! > 0.9968) B[i] = 0.3 + 0.25 * Math.sin(time * 1.7 + noise[i]! * 900);
    }
  }
}

/** Candle flicker on the bright cells of the rose window. */
export function flicker(f: Frame, rose: Circle, time: number): void {
  const { g, B } = f;
  const k = 0.86 + 0.14 * Math.sin(time * 7.3) * Math.sin(time * 2.9 + 1.3) + 0.05 * Math.sin(time * 23);
  const y0 = Math.max(0, Math.floor((rose.y - rose.r) / g.ch));
  const y1 = Math.min(g.rows - 1, Math.ceil((rose.y + rose.r) / g.ch));
  const x0 = Math.max(0, Math.floor((rose.x - rose.r) / g.cw));
  const x1 = Math.min(g.cols - 1, Math.ceil((rose.x + rose.r) / g.cw));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * g.cols + x;
      const dx = (x * g.cw - rose.x) / rose.r;
      const dy = (y * g.ch - rose.y) / rose.r;
      if (B[i]! > 0.5 && dx * dx + dy * dy < 1) B[i] = B[i]! * k;
    }
  }
}

/** Faint rays fanning downward from the rose window. */
export function rays(f: Frame, rose: Circle, lit: number, time: number): void {
  if (lit <= 0) return;
  const { g, B } = f;
  const reach = rose.r * 4.2;
  const y0 = Math.max(0, Math.floor(rose.y / g.ch));
  const y1 = Math.min(g.rows - 1, Math.ceil((rose.y + reach) / g.ch));
  const x0 = Math.max(0, Math.floor((rose.x - reach) / g.cw));
  const x1 = Math.min(g.cols - 1, Math.ceil((rose.x + reach) / g.cw));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x * g.cw - rose.x;
      const dy = y * g.ch - rose.y;
      const d = Math.hypot(dx, dy);
      if (d < rose.r || d > reach) continue;
      const ang = Math.atan2(dx, dy);
      const spread = 1 - Math.abs(ang) / 0.75;
      if (spread <= 0) continue;
      B[y * g.cols + x]! += lit * 0.07 * (0.5 + 0.5 * Math.sin(ang * 16 + time * 0.3)) * (1 - d / reach) * spread;
    }
  }
}

export function fog(f: Frame, groundRow: number, k: number, time: number): void {
  if (k <= 0) return;
  const { g, B, noise } = f;
  for (let y = Math.max(0, Math.floor(groundRow - 9)); y < g.rows; y++) {
    const fk = clamp((y - groundRow + 9) / 9) * k;
    if (fk <= 0) continue;
    for (let x = 0; x < g.cols; x++) {
      const i = y * g.cols + x;
      B[i]! += fk * 0.2 * (0.5 + 0.5 * Math.sin(x * 0.055 + time * 0.35 + Math.sin(y * 0.6 + time * 0.2) * 1.4)) * (0.6 + noise[i]! * 0.8);
    }
  }
}

/** The scene sits slightly dim and brightens in a soft circle around (lx, ly) in px. */
export function lantern(f: Frame, lx: number, ly: number): void {
  const { g, B } = f;
  const lr = g.H * 0.24;
  for (let y = 0; y < g.rows; y++) {
    const dy = (y * g.ch - ly) / lr;
    for (let x = 0; x < g.cols; x++) {
      const dx = (x * g.cw - lx) / lr;
      B[y * g.cols + x]! *= 0.7 + 0.85 * Math.exp(-(dx * dx + dy * dy) * 2.4);
    }
  }
}

/** Dim the band behind the name by up to half. `centre` is its height as a fraction of the viewport. */
export function nameBand(f: Frame, k: number, centre = 0.66): void {
  if (k <= 0) return;
  const { g, B } = f;
  for (let y = 0; y < g.rows; y++) {
    const band = k * 0.5 * smooth(1 - Math.abs((y * g.ch) / g.H - centre) / 0.13);
    if (band <= 0) continue;
    for (let x = 0; x < g.cols; x++) B[y * g.cols + x]! *= 1 - band;
  }
}

export function scale(f: Frame, k: number): void {
  if (k >= 1) return;
  const { B } = f;
  for (let i = 0; i < B.length; i++) B[i] = B[i]! * k;
}

/** Dissolve every cell toward a soft grain no brighter than GLOW_MAX. */
export function glow(f: Frame, k: number): void {
  if (k <= 0) return;
  const { B, noise } = f;
  for (let i = 0; i < B.length; i++) {
    const target = GLOW_MAX * (0.8 + noise[i]! * 0.2);
    B[i] = B[i]! + (target - B[i]!) * k;
  }
}

/**
 * Entrance reveal. Rows above frontRow keep their content, with a flickering ragged edge at the front;
 * rows below are hidden behind sparse falling characters.
 */
export function reveal(f: Frame, frontRow: number, t: number, rnd: () => number = Math.random): void {
  const { g, B, over, colA, colB, colC } = f;
  const span = g.rows * 1.5;
  for (let x = 0; x < g.cols; x++) {
    const fr = frontRow + (colA[x]! - 0.5) * 9;
    const raining = colB[x]! < 0.3;
    const head = (t * (14 + colC[x]! * 24) + colA[x]! * span) % span;
    for (let y = 0; y < g.rows; y++) {
      const i = y * g.cols + x;
      if (y <= fr) {
        if (fr - y < 2.2) {
          B[i] = 0.75 + rnd() * 0.25;
          over[i] = RAMP.charCodeAt(5 + ((rnd() * 5) | 0));
        }
        continue;
      }
      B[i] = 0;
      if (!raining) continue;
      const d = head - y;
      if (d >= 0 && d < 8) {
        B[i] = (1 - d / 8) * 0.85;
        over[i] = RAMP.charCodeAt(2 + ((rnd() * 8) | 0));
      }
    }
  }
}

/** Two dim fluted columns at the left and right screen edges, behind the inventory. */
export function edgeColumns(f: Frame, k: number): void {
  if (k <= 0) return;
  const { g, B, noise } = f;
  const width = 7;
  for (let d = 0; d < width; d++) {
    const v = k * (0.1 + 0.16 * Math.abs(Math.sin((d + 0.5) * 1.05)));
    for (const x of [d, g.cols - 1 - d]) {
      for (let y = 0; y < g.rows; y++) {
        const i = y * g.cols + x;
        B[i] = Math.max(B[i]!, v * (0.85 + noise[i]! * 0.3));
      }
    }
  }
}

const ASH_CHARS = ".'*`,";

export class Ash {
  private p: { x: number; y: number; vx: number; vy: number; c: number }[] = [];

  constructor(g: Grid, count: number, rnd: () => number = Math.random) {
    for (let i = 0; i < count; i++) {
      this.p.push({
        x: rnd() * g.cols, y: rnd() * g.rows,
        vx: -(0.6 + rnd() * 2.2), vy: 0.5 + rnd() * 1.6,
        c: ASH_CHARS.charCodeAt(i % ASH_CHARS.length),
      });
    }
  }

  step(dt: number, time: number, g: Grid): void {
    for (const a of this.p) {
      a.x += a.vx * dt;
      a.y += a.vy * dt + Math.sin(time + a.x * 0.2) * dt * 0.5;
      if (a.x < 0) a.x += g.cols;
      if (a.y >= g.rows) a.y -= g.rows;
      if (a.y < 0) a.y += g.rows;
    }
  }

  stamp(f: Frame, brightness: number): void {
    const { g, B, over } = f;
    for (const a of this.p) {
      const x = a.x | 0;
      const y = a.y | 0;
      if (x < 0 || x >= g.cols || y < 0 || y >= g.rows) continue;
      const i = y * g.cols + x;
      over[i] = a.c;
      B[i] = Math.max(B[i]!, brightness);
    }
  }
}

export class Crows {
  private p: { x: number; y: number; vx: number; vy: number; ph: number }[] = [];

  get count(): number { return this.p.length; }

  /** Send n birds outward and upward from above the towers. */
  launch(g: Grid, n: number, rnd: () => number = Math.random): void {
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      this.p.push({
        x: g.cols / 2 + side * g.cols * (0.1 + rnd() * 0.06),
        y: g.rows * (0.04 + rnd() * 0.22),
        vx: side * (7 + rnd() * 11),
        vy: -(0.8 + rnd() * 2.6),
        ph: rnd() * 6.28,
      });
    }
  }

  step(dt: number, g: Grid): void {
    for (const b of this.p) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.p = this.p.filter(b => b.x > -3 && b.x < g.cols + 3 && b.y > -2 && b.y < g.rows + 2);
  }

  stamp(f: Frame, time: number): void {
    const { g, B, over } = f;
    for (const b of this.p) {
      const up = Math.sin(time * 9 + b.ph) > 0;
      const glyphs = up ? '\\v/' : '-v-';
      const y = b.y | 0;
      if (y < 0 || y >= g.rows) continue;
      for (let k = 0; k < 3; k++) {
        const x = (b.x | 0) + k - 1;
        if (x < 0 || x >= g.cols) continue;
        const i = y * g.cols + x;
        over[i] = glyphs.charCodeAt(k);
        B[i] = 0.9;
      }
    }
  }
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: frame effects, ash and crows"`

---

### Task 6: Nave scene

**Files:**
- Create: `src/scripts/scene/nave.ts`
- Test: `tests/nave.test.ts`

**Interfaces:**
- Consumes: `Grid`, `clamp`, `gray`.
- Produces: `interface NaveView { travelled: number; time: number }` (`travelled` 0..1), `BAYS = 13`, `BAY = 1.6`, `project(g, x, y, z): [number, number]`, `drawNave(ctx, g, v): void`.

World space: x across (columns at ±1), y down (floor at +1, arches spring at -1.2, vault apex at -2), z forward. The camera looks down +z from the origin.

- [ ] **Step 1: Write the failing test**

**File:** `tests/nave.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import type { Grid } from '../src/scripts/grid';
import { BAYS, drawNave, project } from '../src/scripts/scene/nave';
import { stubCtx } from './helpers/stub-ctx';

const g: Grid = { W: 1600, H: 900, dpr: 1, fs: 10, cw: 6, ch: 13, cols: 268, rows: 71, u: 1.305 };

describe('nave', () => {
  it('projects the axis to the vanishing point', () => {
    const [x, y] = project(g, 0, 0, 5);
    expect(x).toBeCloseTo(800);
    expect(y).toBeCloseTo(900 * 0.48);
  });
  it('draws distant points nearer the vanishing point', () => {
    const [nearX] = project(g, 1, 0, 1);
    const [farX] = project(g, 1, 0, 10);
    expect(Math.abs(farX - 800)).toBeLessThan(Math.abs(nearX - 800));
  });
  it('has at least twelve bays', () => {
    expect(BAYS).toBeGreaterThanOrEqual(12);
  });
  it('draws at the start, middle and end without throwing', () => {
    for (const travelled of [0, 0.5, 1]) {
      const { ctx, calls } = stubCtx();
      expect(() => drawNave(ctx, g, { travelled, time: 1 })).not.toThrow();
      expect(calls.stroke).toBeGreaterThan(4);
    }
  });
  it('shows more columns at the start than near the end', () => {
    const a = stubCtx(); drawNave(a.ctx, g, { travelled: 0, time: 0 });
    const b = stubCtx(); drawNave(b.ctx, g, { travelled: 0.95, time: 0 });
    expect(a.calls.stroke!).toBeGreaterThan(b.calls.stroke!);
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, module missing.

- [ ] **Step 3: Implement**

**File:** `src/scripts/scene/nave.ts`
```ts
import type { Grid } from '../grid';
import { clamp } from '../math';
import { gray } from './shapes';

type G = CanvasRenderingContext2D;

export interface NaveView {
  /** 0 at the door, 1 at the far window. */
  travelled: number;
  time: number;
}

export const BAYS = 13;
export const BAY = 1.6;
const FLOOR = 1;
const SPRING = -1.2;
const APEX = -2;
const END_GAP = 1.4;

/** One-point perspective onto the screen, in px. */
export function project(g: Grid, x: number, y: number, z: number): [number, number] {
  const f = g.H * 0.9;
  return [g.W / 2 + (f * x) / z, g.H * 0.48 + (f * y) / z];
}

export function drawNave(c: G, g: Grid, v: NaveView): void {
  const length = BAYS * BAY;
  const camZ = clamp(v.travelled) * length;
  const endZ = Math.max(0.22, length + END_GAP - camZ);
  const P = (x: number, y: number, z: number) => project(g, x, y, z);
  const shade = (z: number) => clamp(1.15 / (0.6 + z * 0.42)) * 235;
  const widthAt = (z: number) => Math.min(g.W * 0.06, Math.max(g.ch * 0.5, (g.H * 0.07) / z));
  const seg = (a: [number, number], b: [number, number]) => {
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  };

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, g.cols, g.rows);
  c.setTransform(g.cols / g.W, 0, 0, g.rows / g.H, 0, 0);
  c.lineCap = 'butt';
  c.lineJoin = 'round';

  // far window
  {
    const a = P(-0.45, 0.7, endZ), b = P(-0.45, -0.9, endZ), top = P(0, -1.75, endZ);
    const d = P(0.45, -0.9, endZ), e = P(0.45, 0.7, endZ);
    const grad = c.createLinearGradient(0, top[1], 0, a[1]);
    grad.addColorStop(0, gray(255));
    grad.addColorStop(1, gray(170));
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
    c.quadraticCurveTo(b[0], (b[1] + top[1]) / 2, top[0], top[1]);
    c.quadraticCurveTo(d[0], (d[1] + top[1]) / 2, d[0], d[1]);
    c.lineTo(e[0], e[1]);
    c.closePath();
    c.fill();
    c.strokeStyle = gray(30);
    c.lineWidth = Math.max(g.cw * 0.6, (g.H * 0.02) / endZ);
    for (const mx of [-0.15, 0.15]) seg(P(mx, 0.7, endZ), P(mx, -1.3, endZ));
    seg(P(-0.45, -0.5, endZ), P(0.45, -0.5, endZ));
  }

  // lines running the length of the nave
  c.strokeStyle = gray(70);
  c.lineWidth = g.ch * 0.45;
  const near = 0.35;
  for (const [x, y] of [[-1, FLOOR], [1, FLOOR], [-0.33, FLOOR], [0.33, FLOOR], [0, APEX], [-1, SPRING], [1, SPRING]] as const) {
    seg(P(x, y, near), P(x, y, endZ));
  }

  // bays, far to near
  for (let k = BAYS; k >= 0; k--) {
    const z = k * BAY + 0.8 - camZ;
    if (z < 0.18 || z > endZ) continue;
    const s = shade(z);
    const lw = widthAt(z);
    const z2 = z + BAY;

    // transverse arch across the nave
    c.strokeStyle = gray(s * 0.8);
    c.lineWidth = lw * 0.6;
    {
      const l = P(-1, SPRING, z), r = P(1, SPRING, z), top = P(0, APEX, z);
      const cl = P(-0.95, -1.75, z), cr = P(0.95, -1.75, z);
      c.beginPath();
      c.moveTo(l[0], l[1]);
      c.quadraticCurveTo(cl[0], cl[1], top[0], top[1]);
      c.quadraticCurveTo(cr[0], cr[1], r[0], r[1]);
      c.stroke();
    }

    // floor joint
    c.strokeStyle = gray(s * 0.45);
    c.lineWidth = lw * 0.4;
    seg(P(-1, FLOOR, z), P(1, FLOOR, z));

    for (const sx of [-1, 1]) {
      // arcade arch to the next column on the same side
      if (z2 <= endZ) {
        const a = P(sx, SPRING, z), top = P(sx, -1.72, z + BAY / 2), b = P(sx, SPRING, z2);
        const ca = P(sx, -1.6, z + BAY * 0.2), cb = P(sx, -1.6, z + BAY * 0.8);
        c.strokeStyle = gray(s * 0.6);
        c.lineWidth = lw * 0.5;
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.quadraticCurveTo(ca[0], ca[1], top[0], top[1]);
        c.quadraticCurveTo(cb[0], cb[1], b[0], b[1]);
        c.stroke();
      }

      // column, capital and base
      c.strokeStyle = gray(s);
      c.lineWidth = lw;
      seg(P(sx, FLOOR, z), P(sx, SPRING, z));
      c.lineWidth = lw * 0.5;
      seg(P(sx - 0.11, SPRING, z), P(sx + 0.11, SPRING, z));
      seg(P(sx - 0.11, FLOOR, z), P(sx + 0.11, FLOOR, z));

      // candle on the column's inner face
      const flick = 0.75 + 0.25 * Math.sin(v.time * 9 + k * 7.3 + sx);
      const [cx, cy] = P(sx * 0.84, 0.2, z);
      const halo = Math.min(g.H * 0.6, (g.H * 0.22) / z);
      const rg = c.createRadialGradient(cx, cy, 0, cx, cy, halo);
      rg.addColorStop(0, `rgba(255,255,255,${0.3 * flick})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = rg;
      c.beginPath(); c.arc(cx, cy, halo, 0, 7); c.fill();
      c.fillStyle = gray(255);
      c.beginPath(); c.arc(cx, cy, Math.max(g.cw * 0.7, (g.H * 0.012) / z), 0, 7); c.fill();
    }
  }
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: nave interior in one-point perspective"`

---

### Task 7: Sigils

**Files:**
- Create: `src/scripts/sigil.ts`
- Test: `tests/sigil.test.ts`

**Interfaces:**
- Consumes: `RAMP`, `clamp`, `hash`.
- Produces: `interface SigilParams { petals: number; rings: number }`, `SW = 43`, `SH = 21`, `sigilGrid(p, phase = 0): string[]`, `assemble(target, k, rnd): string[]`, `mountSigil(pre, p, reduce): () => void` (returns a stop function).

- [ ] **Step 1: Write the failing test**

**File:** `tests/sigil.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { SH, SW, assemble, logoGrid, sigilGrid } from '../src/scripts/sigil';

const p = { petals: 6, rings: 3.2 };

describe('sigil', () => {
  it('is at least 43 by 21 characters', () => {
    const grid = sigilGrid(p);
    expect(grid).toHaveLength(SH);
    for (const row of grid) expect(row).toHaveLength(SW);
    expect(SW).toBeGreaterThanOrEqual(43);
    expect(SH).toBeGreaterThanOrEqual(21);
  });
  it('gives the same grid for the same parameters', () => {
    expect(sigilGrid(p)).toEqual(sigilGrid(p));
  });
  it('gives different grids for different parameters', () => {
    expect(sigilGrid(p)).not.toEqual(sigilGrid({ petals: 4, rings: 4.1 }));
  });
  it('is mirror-symmetric left to right for even petal counts', () => {
    for (const row of sigilGrid(p)) expect(row).toBe([...row].reverse().join(''));
  });
  it('has a solid centre and empty corners', () => {
    const grid = sigilGrid(p);
    expect(grid[(SH - 1) / 2]![(SW - 1) / 2]).toBe('@');
    expect(grid[0]![0]).toBe(' ');
  });
  it('changes with phase but keeps its border', () => {
    const a = sigilGrid(p, 0), b = sigilGrid(p, 1);
    expect(a).not.toEqual(b);
    expect(a[0]).toBe(b[0]);
  });
  it('assembles from noise to the exact target', () => {
    const target = sigilGrid(p);
    const rnd = () => 0.5;
    expect(assemble(target, 1, rnd)).toEqual(target);
    expect(assemble(target, 0, rnd)).not.toEqual(target);
    for (const row of assemble(target, 0.4, rnd)) expect(row).toHaveLength(SW);
  });
  it('turns ink coverage into characters, leaving empty cells blank', () => {
    const cov = new Float32Array(SW * SH);
    cov[0] = 1;
    cov[1] = 0.1;
    cov[2] = 0.4;
    const grid = logoGrid(cov);
    expect(grid).toHaveLength(SH);
    for (const row of grid) expect(row).toHaveLength(SW);
    expect(grid[0]![0]).not.toBe(' ');
    expect(grid[0]![1]).toBe(' ');
    expect(grid[0]![2]).not.toBe(' ');
    expect(grid[5]!.trim()).toBe('');
    expect(logoGrid(cov)).toEqual(grid);
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, module missing.

- [ ] **Step 3: Implement**

**File:** `src/scripts/sigil.ts`
```ts
import { clamp, hash } from './math';
import { RAMP } from './renderer';

export interface SigilParams {
  /** Number of radial lobes. Even values give a left-right symmetric emblem. */
  petals: number;
  /** Ring frequency from centre to edge. */
  rings: number;
}

export const SW = 43;
export const SH = 21;

function radius(x: number, y: number): number {
  return Math.hypot((x - (SW - 1) / 2) / ((SW - 1) / 2), (y - (SH - 1) / 2) / ((SH - 1) / 2));
}

/** The emblem as SH rows of SW characters. `phase` rotates the inner pattern. */
export function sigilGrid(p: SigilParams, phase = 0): string[] {
  const rows: string[] = [];
  for (let y = 0; y < SH; y++) {
    let row = '';
    for (let x = 0; x < SW; x++) {
      const dx = (x - (SW - 1) / 2) / ((SW - 1) / 2);
      const dy = (y - (SH - 1) / 2) / ((SH - 1) / 2);
      const r = Math.hypot(dx, dy);
      let v = 0;
      if (r <= 1) {
        const lobes = 0.5 + 0.5 * Math.cos(Math.atan2(dy, Math.abs(dx)) * p.petals + phase);
        const ring = 0.5 + 0.5 * Math.cos(r * p.rings * Math.PI);
        v = (lobes * 0.62 + ring * 0.55) * (1 - r * 0.3);
        if (Math.abs(r - 0.82) < 0.035) v = 0;
        if (Math.abs(r - 0.95) < 0.05 || r < 0.13) v = 1;
      }
      row += v < 0.5 ? ' ' : RAMP[Math.min(9, 1 + ((((v - 0.5) / 0.5) * 9) | 0))];
    }
    rows.push(row);
  }
  return rows;
}

/** A frame of the assembly animation: cells resolve outward from the centre as k goes 0 to 1. */
export function assemble(target: string[], k: number, rnd: () => number): string[] {
  const t = clamp(k);
  return target.map((row, y) => {
    let out = '';
    for (let x = 0; x < row.length; x++) {
      const r = radius(x, y);
      const done = t >= 1 || t * 1.7 > r * 0.9 + hash(x, y) * 0.6;
      if (done) out += row[x];
      else out += r <= 1.25 && rnd() < 0.55 ? RAMP[1 + ((rnd() * 9) | 0)] : ' ';
    }
    return out;
  });
}

/** Turn per-cell ink coverage (0..1, SW by SH) into rows of characters, with a little grain in solid areas. */
export function logoGrid(cov: Float32Array): string[] {
  const rows: string[] = [];
  for (let y = 0; y < SH; y++) {
    let row = '';
    for (let x = 0; x < SW; x++) {
      const c = cov[y * SW + x] ?? 0;
      if (c < 0.18) { row += ' '; continue; }
      const v = c * (0.62 + 0.38 * hash(x, y));
      row += RAMP[Math.min(9, 1 + ((v * 9) | 0))];
    }
    rows.push(row);
  }
  return rows;
}

/** A character cell is this many times taller than it is wide, as the sigil is styled. */
const CELL_ASPECT = 1.87;

/**
 * Draw a logo (SVG path on a 24x24 grid) or, failing that, a few letters, and measure how much
 * of each character cell it covers. Browser only.
 */
export function rasterise(path: string | null, mark: string | null): Float32Array {
  const SS = 4;
  const canvas = document.createElement('canvas');
  canvas.width = SW * SS;
  canvas.height = SH * SS;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = '#fff';
  const rowsUsed = SH - 1;
  if (path) {
    const sy = (rowsUsed * SS) / 24;
    c.translate(((SW - rowsUsed * CELL_ASPECT) / 2) * SS, 0.5 * SS);
    c.scale(sy * CELL_ASPECT, sy);
    c.fill(new Path2D(path));
  } else if (mark) {
    c.scale(CELL_ASPECT, 1);
    const avail = (SW * SS) / CELL_ASPECT;
    c.font = '700 100px "JetBrains Mono", monospace';
    const size = Math.min(SH * SS * 0.72, (100 * avail * 0.92) / c.measureText(mark).width);
    c.font = `700 ${size}px "JetBrains Mono", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(mark, avail / 2, (SH * SS) / 2);
  }
  const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
  const cov = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      let sum = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) sum += data[((y * SS + j) * canvas.width + x * SS + i) * 4 + 3]!;
      cov[y * SW + x] = sum / (SS * SS * 255);
    }
  }
  return cov;
}

/** Assemble fixed rows into `pre` once. Returns a function that stops the animation. */
export function mountStatic(pre: HTMLElement, target: string[], reduce: boolean): () => void {
  if (reduce) {
    pre.textContent = target.join('\n');
    return () => {};
  }
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const k = (now - start) / 1100;
    pre.textContent = assemble(target, k, Math.random).join('\n');
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** Assemble the emblem into `pre`, then keep it slowly rotating. Returns a function that stops it. */
export function mountSigil(pre: HTMLElement, p: SigilParams, reduce: boolean): () => void {
  if (reduce) {
    pre.textContent = sigilGrid(p).join('\n');
    return () => {};
  }
  const target = sigilGrid(p);
  const start = performance.now();
  const duration = 1300;
  let raf = 0;
  let timer = 0;
  let phase = 0;
  const tick = (now: number) => {
    const k = (now - start) / duration;
    pre.textContent = assemble(target, k, Math.random).join('\n');
    if (k < 1) { raf = requestAnimationFrame(tick); return; }
    timer = window.setInterval(() => {
      phase += 0.045;
      pre.textContent = sigilGrid(p, phase).join('\n');
    }, 90);
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); clearInterval(timer); };
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: generated project sigils"`

---

### Task 8: Content and markup

**Files:**
- Create: `src/content.config.ts`, `src/content/relics/{jms,brainrot-lms,tutorguru,cs102-attendance}.md`, `src/content/journey/{oracle,smu,republic-poly,rotaract}.md`, `src/data/attributes.ts`, `src/data/contact.ts`, `src/components/Frame.astro`, `src/components/Hero.astro`, `src/components/Inventory.astro`, `src/pages/index.astro`, `src/styles/global.css`, `public/resume.pdf` (copied)

**Interfaces:**
- Produces the DOM contract used by `inventory.ts` and `hero.ts`:
  - `canvas#ascii`, `#hero` (gets class `in` when the name lands), `button#hint`, `button#sound`, `.spacer`, `main#inv` (gets class `open`)
  - `nav.tabs a[data-tab]`; `section.tab[data-tab]#<tab>` containing `header.card` and `.frame`
  - list links `a.item[data-item][href="#<tab>/<item>"]`; detail panes `article.detail[data-item]#<tab>/<item>`; relic panes carry `data-petals`, `data-rings` and a `pre.sigil`
  - `html.js` is set by an inline script; all "hidden until selected" rules are scoped under `.js`

- [ ] **Step 1: Content schema and entries**

**File:** `src/content.config.ts`
```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const relics = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/relics' }),
  schema: z.object({
    order: z.number(),
    short: z.string(),
    full: z.string(),
    lead: z.string(),
    stack: z.array(z.string()),
    points: z.array(z.string()),
    lore: z.string(),
    loreDraft: z.boolean().default(false),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    sigil: z.object({ petals: z.number(), rings: z.number() }),
  }),
});

const journey = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/journey' }),
  schema: z.object({
    order: z.number(),
    short: z.string(),
    title: z.string(),
    place: z.string(),
    dates: z.string(),
    years: z.string(),
    points: z.array(z.string()),
  }),
});

export const collections = { relics, journey };
```

**File:** `src/content/relics/jms.md`
```md
---
order: 1
short: JMS
full: Just Meal Savers
lead: KEYCLOAK
stack: [Keycloak, Temporal, Microservices]
points:
  - Integrated Keycloak for authentication, role-based access control and route protection across frontend and backend services.
  - Built the refund service on Temporal workflows to manage distributed transaction states reliably.
lore: A refund that fails halfway is worse than one that never starts. This is the part that makes sure it finishes.
loreDraft: true
sigil: { petals: 6, rings: 3.2 }
---
```

**File:** `src/content/relics/brainrot-lms.md`
```md
---
order: 2
short: Brainrot LMS
full: CS203 Brainrot LMS
lead: KEYCLOAK
stack: [Keycloak, RBAC, Integration testing]
points:
  - Implemented end-to-end Keycloak authentication and role-based access control for user profiles and role assignments.
  - Developed a Kanban-style lesson board for contributor workflows and conducted end-to-end integration testing.
lore: A learning platform is only as good as the people allowed to shape it, and the gates that decide who they are.
loreDraft: true
sigil: { petals: 4, rings: 4.1 }
---
```

**File:** `src/content/relics/tutorguru.md`
```md
---
order: 3
short: TutorGuru
full: TutorGuru
lead: VUE.JS
stack: [Vue.js, Firebase, Firestore]
points:
  - "Built the main parent-to-tutor flow: posting assignments, tutors applying from the dashboard or map, and parents picking a tutor."
  - Migrated the app from dummy data to Firestore and added filtering, pagination, dark mode and email reminders.
lore: Every tutoring match starts as a request nobody has answered yet.
loreDraft: true
sigil: { petals: 8, rings: 2.4 }
---
```

**File:** `src/content/relics/cs102-attendance.md`
```md
---
order: 4
short: CS102 Attendance
full: CS102 Attendance Taking
lead: SPRING BOOT
stack: [Spring Boot, REST APIs, Face recognition]
points:
  - "Built the student management backend for a Spring Boot attendance system with face recognition: the Student/User entity model and the repository and database layer."
  - Developed REST APIs for enrolling students in courses and for checks on uploaded face images.
lore: The roll is called by a camera now. Someone still has to decide what a student is.
loreDraft: true
sigil: { petals: 10, rings: 3.7 }
---
```

**File:** `src/content/journey/oracle.md`
```md
---
order: 1
short: Oracle
title: Backend Developer Intern
place: Oracle, Singapore
dates: Apr 2023 to Mar 2024
years: "2023–24"
points:
  - Built and maintained 5 enterprise applications using Oracle APEX and PL/SQL, across content management, workflow automation, reporting and template-driven systems.
  - Designed relational database schemas and complex SQL queries for efficient data processing.
  - Developed RESTful APIs and JSON-based integrations to automate file-processing workflows, improving workflow turnaround time by about 30%.
  - Took part in 2 full software development lifecycles, through to production deployment under Oracle's Corporate Security Solution Assurance Process.
---
```

**File:** `src/content/journey/smu.md`
```md
---
order: 2
short: SMU
title: Bachelor of Science (Software Engineering)
place: Singapore Management University
dates: Aug 2024 to Jun 2028 (expected)
years: "2024–28"
points:
  - GPA 3.8 / 4.0.
  - "Dean's List: AY2024/25 and AY2025/26."
  - "Coursework: Web Application Development, Algorithms and Programming, Enterprise Solution Management, Enterprise Solution Development, Collaborative Software Development."
---
```

**File:** `src/content/journey/republic-poly.md`
```md
---
order: 3
short: Republic Poly
title: Diploma in Information Technology
place: Republic Polytechnic, Singapore
dates: 2021 to 2024
years: "2021–24"
points:
  - GPA 3.9 / 4.0.
---
```

**File:** `src/content/journey/rotaract.md`
```md
---
order: 4
short: Rotaract
title: Logistics and Programmes
place: SMU Rotaract (Project Candela)
dates: Sep 2024 to Jun 2025
years: "2024–25"
points:
  - Coordinated logistics and operational planning for 12+ community outreach events.
  - Planned and facilitated engagement activities for beneficiaries across 12 community events.
  - Worked in a 5-member committee and managed 20 volunteers under tight event timelines.
---
```

**File:** `src/data/attributes.ts`
```ts
import {
  siCss, siDocker, siFirebase, siFlask, siGit, siGithubactions, siHtml5, siJavascript, siKeycloak, siMysql,
  siOpenjdk, siPostgresql, siPython, siSpringboot, siTemporal, siVuedotjs,
} from 'simple-icons';

export interface Ref { label: string; href: string }

export interface Skill {
  id: string;
  name: string;
  /** SVG path data on a 24x24 grid, when a free single-colour logo exists. */
  icon?: string;
  /** Letters shown in the slot when there is no logo. */
  mark?: string;
  usedIn: Ref[];
}

export interface SkillGroup { title: string; skills: Skill[] }

const jms = { label: 'JMS', href: '#relics/jms' };
const lms = { label: 'Brainrot LMS', href: '#relics/brainrot-lms' };
const tutor = { label: 'TutorGuru', href: '#relics/tutorguru' };
const cs102 = { label: 'CS102 Attendance', href: '#relics/cs102-attendance' };
const oracle = { label: 'Oracle internship', href: '#journey/oracle' };

/**
 * Technologies shown as equipment slots. `usedIn` holds only what the résumé supports;
 * skills without a named project carry no link.
 */
export const equipment: SkillGroup[] = [
  {
    title: 'Languages',
    skills: [
      { id: 'java', name: 'Java', icon: siOpenjdk.path, usedIn: [] },
      { id: 'python', name: 'Python', icon: siPython.path, usedIn: [] },
      { id: 'javascript', name: 'JavaScript', icon: siJavascript.path, usedIn: [] },
      { id: 'html', name: 'HTML', icon: siHtml5.path, usedIn: [] },
      { id: 'css', name: 'CSS', icon: siCss.path, usedIn: [] },
      { id: 'sql', name: 'SQL', mark: 'SQL', usedIn: [oracle] },
      { id: 'plsql', name: 'PL/SQL', mark: 'PL', usedIn: [oracle] },
    ],
  },
  {
    title: 'Frameworks and Tools',
    skills: [
      { id: 'spring-boot', name: 'Spring Boot', icon: siSpringboot.path, usedIn: [cs102] },
      { id: 'flask', name: 'Flask', icon: siFlask.path, usedIn: [] },
      { id: 'vue', name: 'Vue.js', icon: siVuedotjs.path, usedIn: [tutor] },
      { id: 'keycloak', name: 'Keycloak', icon: siKeycloak.path, usedIn: [jms, lms] },
      { id: 'temporal', name: 'Temporal', icon: siTemporal.path, usedIn: [jms] },
      { id: 'rest', name: 'REST APIs', mark: 'REST', usedIn: [cs102, oracle] },
      { id: 'apex', name: 'Oracle APEX', mark: 'APEX', usedIn: [oracle] },
      { id: 'git', name: 'Git', icon: siGit.path, usedIn: [] },
    ],
  },
  {
    title: 'Cloud and DevOps',
    skills: [
      { id: 'aws', name: 'AWS', mark: 'AWS', usedIn: [] },
      { id: 'azure', name: 'Microsoft Azure', mark: 'AZ', usedIn: [] },
      { id: 'firebase', name: 'Firebase', icon: siFirebase.path, usedIn: [tutor] },
      { id: 'docker', name: 'Docker', icon: siDocker.path, usedIn: [] },
      { id: 'github-actions', name: 'GitHub Actions', icon: siGithubactions.path, usedIn: [] },
    ],
  },
  {
    title: 'Databases',
    skills: [
      { id: 'postgresql', name: 'PostgreSQL', icon: siPostgresql.path, usedIn: [] },
      { id: 'mysql', name: 'MySQL', icon: siMysql.path, usedIn: [] },
    ],
  },
];

/** Things with no logo, shown as plain lists under the grid. */
export const lists: { title: string; entries: string[] }[] = [
  {
    title: 'Concepts',
    entries: ['Object-Oriented Programming', 'Microservices', 'Database Design', 'CI/CD', 'Agile Development'],
  },
  {
    title: 'Certifications',
    entries: ['Google UX Design (Jul 2025)', 'SCS-AWS GenAI, Foundational (Dec 2024)', 'Google AI Essentials (Aug 2024)'],
  },
];
```

**File:** `src/data/contact.ts`
```ts
export const contact = {
  email: 'adzaki.o.2024@computing.smu.edu.sg',
  linkedin: { label: 'linkedin.com/in/ahmaddzakibinosman', url: 'https://www.linkedin.com/in/ahmaddzakibinosman' },
  github: { label: 'github.com/Dzakiki', url: 'https://github.com/Dzakiki' },
  resume: 'resume.pdf',
};
```

- [ ] **Step 2: Components and page**

**File:** `src/components/Frame.astro`
```astro
---
interface Props { single?: boolean }
const { single = false } = Astro.props;
const ornament = ['@==+--o-.', '#  .-\'   ', '+-\'      ', 'o        ', '.        '].join('\n');
---
<div class:list={['frame', { single }]}>
  {['tl', 'tr', 'bl', 'br'].map(pos => <pre class={`corner ${pos}`} aria-hidden="true">{ornament}</pre>)}
  <slot />
</div>
```

**File:** `src/components/Hero.astro`
```astro
---
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
---
<canvas id="ascii" aria-hidden="true"></canvas>
<header id="hero" style={`--poster:url(${base}poster.png)`}>
  <h1 class="name">AHMAD DZAKI</h1>
  <div class="rule"></div>
  <p class="sub">SOFTWARE ENGINEERING STUDENT · SINGAPORE MANAGEMENT UNIVERSITY</p>
</header>
<button id="hint" type="button">DESCEND<span aria-hidden="true">v</span></button>
<button id="sound" type="button" aria-pressed="false">SOUND: OFF</button>
<div class="spacer" aria-hidden="true"></div>
```

**File:** `src/components/Inventory.astro`
```astro
---
import { getCollection } from 'astro:content';
import Frame from './Frame.astro';
import { equipment, lists } from '../data/attributes';
import { contact } from '../data/contact';

const relics = (await getCollection('relics')).sort((a, b) => a.data.order - b.data.order);
const journey = (await getCollection('journey')).sort((a, b) => a.data.order - b.data.order);
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const tabs = ['relics', 'journey', 'attributes', 'contact'];
---
<main id="inv">
  <nav class="tabs" aria-label="Sections">
    {tabs.map(t => <a href={`#${t}`} data-tab={t}>{t.toUpperCase()}</a>)}
  </nav>

  <section class="tab" id="relics" data-tab="relics">
    <header class="card"><h2>RELICS</h2><div class="wings"><i></i><span>PROJECTS</span><i></i></div></header>
    <Frame>
      <div class="list">
        <div class="cap">HELD · {relics.length}</div>
        {relics.map(r => <a class="item" href={`#relics/${r.id}`} data-item={r.id}>{r.data.short}<small>{r.data.lead}</small></a>)}
        <div class="keys" aria-hidden="true">↑ ↓ BROWSE · ← → SECTIONS</div>
      </div>
      <div class="details">
        {relics.map(r => (
          <article class="detail relic" id={`relics/${r.id}`} data-item={r.id} data-petals={r.data.sigil.petals} data-rings={r.data.sigil.rings}>
            <pre class="sigil" aria-hidden="true"></pre>
            <div class="body">
              <h3>{r.data.full}</h3>
              <p class="stack">{r.data.stack.join(' · ')}</p>
              <ul>{r.data.points.map(p => <li>{p}</li>)}</ul>
              <p class="lore">{r.data.lore}</p>
              {r.data.links.length > 0 && <p class="links">{r.data.links.map(l => <a href={l.url}>{l.label} →</a>)}</p>}
            </div>
          </article>
        ))}
      </div>
    </Frame>
  </section>

  <section class="tab" id="journey" data-tab="journey">
    <header class="card"><h2>JOURNEY</h2><div class="wings"><i></i><span>EXPERIENCE AND EDUCATION</span><i></i></div></header>
    <Frame>
      <div class="list">
        <div class="cap">WALKED · {journey.length}</div>
        {journey.map(j => <a class="item" href={`#journey/${j.id}`} data-item={j.id}>{j.data.short}<small>{j.data.years}</small></a>)}
        <div class="keys" aria-hidden="true">↑ ↓ BROWSE · ← → SECTIONS</div>
      </div>
      <div class="details">
        {journey.map(j => (
          <article class="detail" id={`journey/${j.id}`} data-item={j.id}>
            <div class="years" aria-hidden="true">{j.data.years}</div>
            <div class="body">
              <h3>{j.data.title}</h3>
              <p class="stack">{j.data.place} · {j.data.dates}</p>
              <ul>{j.data.points.map(p => <li>{p}</li>)}</ul>
            </div>
          </article>
        ))}
      </div>
    </Frame>
  </section>

  <section class="tab" id="attributes" data-tab="attributes">
    <header class="card"><h2>ATTRIBUTES</h2><div class="wings"><i></i><span>SKILLS</span><i></i></div></header>
    <Frame>
      <div class="list slots">
        {equipment.map(grp => (
          <div class="slot-group">
            <div class="cap">{grp.title.toUpperCase()}</div>
            <div class="grid">
              {grp.skills.map(s => (
                <a class="item slot" href={`#attributes/${s.id}`} data-item={s.id} title={s.name} aria-label={s.name}>
                  {s.icon
                    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d={s.icon} /></svg>
                    : <span class="mark" aria-hidden="true">{s.mark}</span>}
                </a>
              ))}
            </div>
          </div>
        ))}
        <div class="keys" aria-hidden="true">↑ ↓ ← → BROWSE</div>
      </div>
      <div class="details">
        {equipment.flatMap(grp => grp.skills.map(s => (
          <article class="detail" id={`attributes/${s.id}`} data-item={s.id} data-path={s.icon} data-mark={s.mark}>
            <pre class="sigil" aria-hidden="true"></pre>
            <div class="body">
              <h3>{s.name}</h3>
              <p class="stack">{grp.title}</p>
              {s.usedIn.length > 0 && (
                <div class="used">
                  <p class="used-cap">USED IN</p>
                  <ul>{s.usedIn.map(u => <li><a href={u.href}>{u.label}</a></li>)}</ul>
                </div>
              )}
            </div>
          </article>
        )))}
      </div>
      <div class="extras">
        {lists.map(l => (
          <div>
            <h3>{l.title.toUpperCase()}</h3>
            <ul>{l.entries.map(e => <li>{e}</li>)}</ul>
          </div>
        ))}
      </div>
    </Frame>
  </section>

  <section class="tab" id="contact" data-tab="contact">
    <header class="card"><h2>CONTACT</h2><div class="wings"><i></i><span>GET IN TOUCH</span><i></i></div></header>
    <Frame single>
      <dl class="contact">
        <div><dt>EMAIL</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>
        <div><dt>LINKEDIN</dt><dd><a href={contact.linkedin.url}>{contact.linkedin.label}</a></dd></div>
        <div><dt>GITHUB</dt><dd><a href={contact.github.url}>{contact.github.label}</a></dd></div>
        <div><dt>RÉSUMÉ</dt><dd><a href={`${base}${contact.resume}`} download>Download PDF</a></dd></div>
      </dl>
    </Frame>
  </section>
</main>
```

**File:** `src/pages/index.astro`
```astro
---
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '../styles/global.css';
import Hero from '../components/Hero.astro';
import Inventory from '../components/Inventory.astro';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Ahmad Dzaki, Software Engineering student at Singapore Management University. Backend projects, experience and contact." />
    <meta name="theme-color" content="#0A0A0A" />
    <title>Ahmad Dzaki · Software Engineering</title>
    <script is:inline>document.documentElement.classList.add('js');</script>
  </head>
  <body>
    <Hero />
    <Inventory />
    <script>
      import '../scripts/main.ts';
    </script>
  </body>
</html>
```

- [ ] **Step 3: Styles**

**File:** `src/styles/global.css`
```css
:root {
  --bg: #0A0A0A;
  --bone: #E4DFD3;
  --dim: #8A867D;
  --line: #3A3833;
  --ease: cubic-bezier(.16, .8, .2, 1);
  --display: 'Cormorant Garamond', Georgia, serif;
  --reading: 'EB Garamond', Georgia, serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--bg); }
body { color: var(--bone); font-family: var(--reading); overflow-x: hidden; }
a { color: inherit; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--bone); outline-offset: 3px; }

/* ---------- canvas and hero ---------- */
#ascii { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; z-index: 0; }
#hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 57vh; text-align: center;
        background: var(--bg) var(--poster) center / cover no-repeat; }
.js #hero { position: fixed; inset: 0; z-index: 2; pointer-events: none; background: none; opacity: 0; }
.name { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 6.5vw, 132px); line-height: 1; white-space: nowrap;
        letter-spacing: .16em; margin-right: -.16em;
        text-shadow: 0 0 24px var(--bg), 0 0 48px var(--bg), 0 0 90px var(--bg); }
.rule { height: 1px; width: min(46vw, 620px); background: var(--bone); margin: 2.2vh auto 1.8vh; }
.sub { font-family: var(--mono); font-size: clamp(9px, 1.05vw, 15px); letter-spacing: .34em; margin-right: -.34em; padding: 0 16px;
       text-shadow: 0 0 12px var(--bg), 0 0 24px var(--bg); }
.js #hero .name { transition: letter-spacing 2.6s var(--ease), margin-right 2.6s var(--ease), opacity 1.2s ease; }
.js #hero .rule { transition: width 1.8s var(--ease) .5s; }
.js #hero .sub { transition: opacity 1.4s ease 1.1s; }
.js #hero:not(.in) .name { letter-spacing: .6em; margin-right: -.6em; opacity: 0; }
.js #hero:not(.in) .rule { width: 0; }
.js #hero:not(.in) .sub { opacity: 0; }

#hint, #sound { position: fixed; z-index: 3; background: none; border: 0; color: var(--bone); cursor: pointer; font-family: var(--mono); text-shadow: 0 0 10px var(--bg); }
#hint { left: 50%; bottom: 3.2vh; transform: translateX(-50%); font-size: 11px; letter-spacing: .4em; padding: 10px 16px; opacity: 0; transition: opacity 1s ease; }
#hint.in { opacity: .85; }
#hint span { display: block; margin-top: 6px; animation: bob 1.8s ease-in-out infinite; }
#sound { top: 18px; right: 20px; font-size: 10.5px; letter-spacing: .24em; padding: 8px 10px; color: var(--dim); }
#sound[aria-pressed="true"] { color: var(--bone); }
@keyframes bob { 50% { transform: translateY(6px); opacity: .4; } }
html:not(.js) #ascii, html:not(.js) #hint, html:not(.js) #sound, html:not(.js) .spacer { display: none; }
.js .spacer { height: 500vh; }

/* ---------- inventory shell ---------- */
#inv { position: relative; z-index: 1; min-height: 100vh; padding: 5vh 5vw 8vh; display: flex; flex-direction: column; align-items: center; }
.tabs { display: flex; gap: clamp(14px, 4vw, 56px); flex-wrap: wrap; justify-content: center; font-family: var(--mono); font-size: 12px; letter-spacing: .3em; margin-bottom: 4vh; }
.tabs a { color: var(--dim); text-decoration: none; padding-bottom: 6px; border-bottom: 1px solid transparent; }
.tabs a:hover { color: var(--bone); }
.tabs a.on { color: var(--bone); border-bottom-color: var(--bone); }
.js #inv .tabs { opacity: 0; transition: opacity 1s ease .9s; }
.js #inv.open .tabs { opacity: 1; }

.tab { width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 10vh; }
.js .tab { margin-bottom: 0; }
.js .tab:not(.active) { display: none; }

.card { text-align: center; margin-bottom: 4vh; }
.card h2 { font-family: var(--display); font-weight: 600; font-size: clamp(40px, 7vw, 120px); line-height: 1; letter-spacing: .3em; margin-right: -.3em; }
.card .wings { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 16px; font-family: var(--mono); font-size: 12px; letter-spacing: .4em; color: var(--dim); }
.card .wings i { display: block; height: 1px; width: min(22vw, 300px); background: var(--bone); }
.js .card h2 { transition: letter-spacing 2s var(--ease), margin-right 2s var(--ease), opacity 1s ease; }
.js .card .wings { transition: opacity 1s ease .8s; }
.js .card .wings i { transition: width 1.6s var(--ease) .3s; }
.js .card.quick h2 { transition-duration: .8s, .8s, .5s; }
.js .card.quick .wings { transition: opacity .5s ease .2s; }
.js .card.quick .wings i { transition: width .7s var(--ease) .1s; }
.js .card:not(.in) h2 { letter-spacing: .7em; margin-right: -.7em; opacity: 0; transition: none; }
.js .card:not(.in) .wings { opacity: 0; transition: none; }
.js .card:not(.in) .wings i { width: 0; transition: none; }

/* ---------- frame ---------- */
.frame { position: relative; width: min(1240px, 100%); border: 1px solid var(--bone); outline: 1px solid var(--line); outline-offset: 7px; background: rgba(10, 10, 10, .88);
         display: grid; grid-template-columns: minmax(220px, 320px) 1fr; }
.frame.single { display: block; padding: clamp(24px, 4vw, 56px); }
.frame::before, .frame::after { content: "◆"; position: absolute; left: 50%; transform: translateX(-50%); font-size: 14px; line-height: 1; background: var(--bg); padding: 0 6px; }
.frame::before { top: -8px; }
.frame::after { bottom: -8px; }
.corner { position: absolute; font-family: var(--mono); font-size: 10px; line-height: 1.15; color: var(--dim); pointer-events: none; margin: 6px; }
.corner.tl { top: 0; left: 0; }
.corner.tr { top: 0; right: 0; transform: scaleX(-1); }
.corner.bl { bottom: 0; left: 0; transform: scaleY(-1); }
.corner.br { bottom: 0; right: 0; transform: scale(-1, -1); }
.js #inv .frame { opacity: 0; transform: translateY(40px); transition: opacity 1.2s ease 1.1s, transform 1.4s var(--ease) 1.1s; }
.js #inv.open .frame { opacity: 1; transform: none; }

/* ---------- list and detail ---------- */
.list { border-right: 1px solid var(--line); padding: 26px 0 22px; }
.list .cap { font-family: var(--mono); font-size: 11px; letter-spacing: .3em; color: var(--dim); padding: 0 26px 14px 62px; }
.item { display: block; text-decoration: none; color: var(--dim); font-family: var(--display); font-weight: 500; font-size: 27px; letter-spacing: .03em; padding: 13px 26px; transition: color .2s, padding .3s; }
.item:hover { color: var(--bone); padding-left: 34px; }
.item.sel { background: var(--bone); color: var(--bg); padding-left: 34px; }
.item small { display: block; font-family: var(--mono); font-size: 10.5px; letter-spacing: .16em; margin-top: 3px; opacity: .75; }
.list .keys { font-family: var(--mono); font-size: 10px; letter-spacing: .18em; color: var(--dim); padding: 22px 26px 0; }
html:not(.js) .list .keys { display: none; }

.details { min-width: 0; }
.detail { padding: 34px clamp(20px, 3.4vw, 54px) 42px; display: grid; grid-template-columns: auto 1fr; gap: clamp(18px, 3vw, 46px); align-items: start; min-height: 540px; }
html:not(.js) .detail { min-height: 0; border-bottom: 1px solid var(--line); }
.js .detail:not(.sel) { display: none; }
.sigil { font-family: var(--mono); font-size: clamp(7px, .9vw, 12.5px); line-height: 1.12; color: var(--bone); min-width: 43ch; min-height: 23.6em; }
html:not(.js) .sigil { display: none; }
.years { font-family: var(--display); font-weight: 500; font-size: clamp(34px, 4.6vw, 76px); line-height: 1; color: var(--dim); letter-spacing: .02em; writing-mode: vertical-rl; transform: rotate(180deg); }
.detail h3 { font-family: var(--display); font-weight: 600; font-size: clamp(32px, 4.2vw, 66px); line-height: 1.02; letter-spacing: .02em; }
.stack { font-family: var(--mono); font-size: 12.5px; letter-spacing: .14em; color: var(--dim); margin: 12px 0 20px; text-transform: uppercase; }
.detail ul { list-style: none; font-size: 21px; line-height: 1.45; }
.detail li { padding-left: 26px; position: relative; margin-bottom: 8px; }
.detail li::before { content: "◆"; position: absolute; left: 0; top: 7px; font-size: 11px; }
.lore { font-style: italic; font-size: 19.5px; line-height: 1.5; color: var(--dim); border-top: 1px solid var(--line); margin-top: 20px; padding-top: 16px; }
.links { margin-top: 18px; font-family: var(--mono); font-size: 12.5px; letter-spacing: .1em; display: flex; gap: 22px; flex-wrap: wrap; }
.links a { text-underline-offset: 4px; }
.js .detail.sel .body > * { opacity: 0; transform: translateY(10px); animation: rise .7s var(--ease) forwards; }
.js .detail.sel .body > :nth-child(1) { animation-delay: .25s; }
.js .detail.sel .body > :nth-child(2) { animation-delay: .42s; }
.js .detail.sel .body > :nth-child(3) { animation-delay: .6s; }
.js .detail.sel .body > :nth-child(4) { animation-delay: .9s; }
.js .detail.sel .body > :nth-child(5) { animation-delay: 1.05s; }
@keyframes rise { to { opacity: 1; transform: none; } }

/* ---------- attributes and contact ---------- */
#attributes .frame { grid-template-columns: minmax(280px, 392px) 1fr; }
.slots { padding: 30px 26px 24px; }
.slots .cap { padding: 0 0 10px; }
.slot-group:first-child .cap { padding-left: 38px; }
.slot-group + .slot-group { margin-top: 22px; }
.slots .grid { display: grid; grid-template-columns: repeat(auto-fill, 58px); gap: 9px; }
.item.slot, .item.slot:hover, .item.slot.sel { width: 58px; height: 58px; padding: 0; display: grid; place-items: center; border: 1px solid var(--line); }
.item.slot:hover { border-color: var(--bone); }
.item.slot.sel { border-color: var(--bone); }
.slot svg { width: 28px; height: 28px; fill: currentColor; }
.slot .mark { font-family: var(--mono); font-weight: 500; font-size: 11.5px; letter-spacing: .06em; }
.slots .keys { padding: 22px 0 0; }
#attributes .detail { min-height: 430px; }
.used-cap { font-family: var(--mono); font-size: 11px; letter-spacing: .3em; color: var(--dim); margin: 6px 0 10px; }
.used a { text-decoration-thickness: 1px; text-underline-offset: 5px; }
.extras { grid-column: 1 / -1; border-top: 1px solid var(--line); padding: 28px clamp(24px, 3.4vw, 54px) 36px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 26px 56px; }
.extras h3 { font-family: var(--mono); font-weight: 400; font-size: 11px; letter-spacing: .3em; color: var(--dim); margin-bottom: 10px; }
.extras ul { list-style: none; font-size: 19px; line-height: 1.6; }
.contact { display: grid; gap: 26px; max-width: 760px; margin: 0 auto; }
.contact dt { font-family: var(--mono); font-size: 11px; letter-spacing: .3em; color: var(--dim); margin-bottom: 6px; }
.contact dd { font-family: var(--display); font-weight: 500; font-size: clamp(22px, 3vw, 40px); overflow-wrap: anywhere; }
.contact a { text-decoration-thickness: 1px; text-underline-offset: 6px; }

/* ---------- narrow screens ---------- */
@media (max-width: 820px) {
  .frame { grid-template-columns: 1fr; }
  .list { border-right: 0; border-bottom: 1px solid var(--line); }
  .list .cap { padding-left: 26px; }
  .list .keys { display: none; }
  .detail { grid-template-columns: 1fr; min-height: 0; }
  .sigil { justify-self: center; min-width: 0; }
  .years { writing-mode: horizontal-tb; transform: none; }
  .corner { display: none; }
}

/* On portrait screens the cathedral sits low, so the name goes in the sky above it. */
@media (max-aspect-ratio: 3/4) {
  #hero { padding-top: 13vh; }
  .sub { letter-spacing: .2em; margin-right: -.2em; line-height: 1.7; }
}

/* ---------- reduced motion ---------- */
.still *, .still *::before, .still *::after { transition: none !important; animation-duration: .01s !important; animation-delay: 0s !important; }
```

- [ ] **Step 4: Copy the résumé**

Copy the résumé PDF to `public/resume.pdf` (a version without a phone number).

- [ ] **Step 5: Temporary boot file so the page builds**

`main.ts` is completed in Task 10. For now:

**File:** `src/scripts/main.ts`
```ts
document.documentElement.dataset.ready = '1';
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build succeeds; `dist/index.html` contains `Just Meal Savers`, `Backend Developer Intern`, `Keycloak` and `Download PDF`, and does not contain the phone number.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: content, markup and styles for hero and inventory"`

---

### Task 9: Inventory behaviour

**Files:**
- Create: `src/scripts/inventory.ts`
- Test: `tests/inventory.test.ts`

**Interfaces:**
- Consumes: `mountSigil` from `sigil.ts`, `clamp`.
- Produces: `type TabId = 'relics' | 'journey' | 'attributes' | 'contact'`, `TABS`, `interface Route { tab: TabId; item: string | null }`, `parseHash(hash, items): Route | null`, `formatHash(route): string`, `stepItem(list, current, delta): string | null`, `stepTab(current, delta): TabId`, `initInventory(root, opts: { reduce: boolean; onSelect?: () => void }): Inventory` where `Inventory = { items: Record<TabId, string[]>; route(): Route; go(route, push?): void; open(): void }`.

- [ ] **Step 1: Write the failing test**

**File:** `tests/inventory.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { formatHash, parseHash, stepGrid, stepItem, stepTab } from '../src/scripts/inventory';

const items = { relics: ['jms', 'tutorguru'], journey: ['oracle'], attributes: [], contact: [] };

describe('routes', () => {
  it('parses a tab and item', () => {
    expect(parseHash('#relics/tutorguru', items)).toEqual({ tab: 'relics', item: 'tutorguru' });
  });
  it('defaults to the first item of a tab', () => {
    expect(parseHash('#journey', items)).toEqual({ tab: 'journey', item: 'oracle' });
  });
  it('gives a null item for tabs without a list', () => {
    expect(parseHash('#contact', items)).toEqual({ tab: 'contact', item: null });
  });
  it('falls back to the first item when the item is unknown', () => {
    expect(parseHash('#relics/nope', items)).toEqual({ tab: 'relics', item: 'jms' });
  });
  it('rejects empty and unknown hashes', () => {
    expect(parseHash('', items)).toBeNull();
    expect(parseHash('#', items)).toBeNull();
    expect(parseHash('#blog', items)).toBeNull();
  });
  it('formats routes back to hashes', () => {
    expect(formatHash({ tab: 'relics', item: 'jms' })).toBe('#relics/jms');
    expect(formatHash({ tab: 'contact', item: null })).toBe('#contact');
  });
  it('round-trips', () => {
    const r = { tab: 'relics' as const, item: 'tutorguru' };
    expect(parseHash(formatHash(r), items)).toEqual(r);
  });
});

describe('stepping', () => {
  it('moves through a list and stops at the ends', () => {
    expect(stepItem(['a', 'b', 'c'], 'a', 1)).toBe('b');
    expect(stepItem(['a', 'b', 'c'], 'c', 1)).toBe('c');
    expect(stepItem(['a', 'b', 'c'], 'a', -1)).toBe('a');
    expect(stepItem([], null, 1)).toBeNull();
  });
  it('moves through tabs and stops at the ends', () => {
    expect(stepTab('relics', 1)).toBe('journey');
    expect(stepTab('relics', -1)).toBe('relics');
    expect(stepTab('contact', 1)).toBe('contact');
  });
  it('moves by row in a grid and picks the nearest column', () => {
    const cells = [
      { id: 'a', x: 10, y: 10 }, { id: 'b', x: 70, y: 10 }, { id: 'c', x: 130, y: 10 },
      { id: 'd', x: 10, y: 70 }, { id: 'e', x: 70, y: 70 },
      { id: 'f', x: 10, y: 160 },
    ];
    expect(stepGrid(cells, 'b', 1)).toBe('e');
    expect(stepGrid(cells, 'c', 1)).toBe('e');
    expect(stepGrid(cells, 'e', 1)).toBe('f');
    expect(stepGrid(cells, 'f', -1)).toBe('d');
    expect(stepGrid(cells, 'a', -1)).toBe('a');
    expect(stepGrid(cells, 'f', 1)).toBe('f');
    expect(stepGrid(cells, null, 1)).toBe('a');
    expect(stepGrid([], null, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, module missing.

- [ ] **Step 3: Implement**

**File:** `src/scripts/inventory.ts`
```ts
import { clamp } from './math';
import { logoGrid, mountSigil, mountStatic, rasterise } from './sigil';

export type TabId = 'relics' | 'journey' | 'attributes' | 'contact';
export const TABS: TabId[] = ['relics', 'journey', 'attributes', 'contact'];

export interface Route { tab: TabId; item: string | null }

export interface Inventory {
  items: Record<TabId, string[]>;
  route(): Route;
  go(route: Route, push?: boolean): void;
  open(): void;
}

export function parseHash(hash: string, items: Record<TabId, string[]>): Route | null {
  const m = /^#([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(hash);
  if (!m) return null;
  const tab = m[1] as TabId;
  if (!TABS.includes(tab)) return null;
  const list = items[tab];
  const first = list[0] ?? null;
  return { tab, item: m[2] && list.includes(m[2]) ? m[2] : first };
}

export function formatHash(r: Route): string {
  return `#${r.tab}${r.item ? `/${r.item}` : ''}`;
}

export function stepItem(list: string[], current: string | null, delta: 1 | -1): string | null {
  if (!list.length) return null;
  const i = Math.max(0, list.indexOf(current ?? ''));
  return list[clamp(i + delta, 0, list.length - 1)]!;
}

/**
 * Move up or down a row in a grid of cells given by their centre points.
 * Picks the nearest row in that direction, then the cell in it closest horizontally.
 * Stays put when there is no row that way.
 */
export function stepGrid(cells: { id: string; x: number; y: number }[], current: string | null, delta: 1 | -1): string | null {
  const cur = cells.find(c => c.id === current);
  if (!cur) return cells[0]?.id ?? null;
  const beyond = cells.filter(c => (delta > 0 ? c.y > cur.y + 1 : c.y < cur.y - 1));
  if (!beyond.length) return cur.id;
  const rowY = delta > 0 ? Math.min(...beyond.map(c => c.y)) : Math.max(...beyond.map(c => c.y));
  const row = beyond.filter(c => Math.abs(c.y - rowY) < 1);
  return row.reduce((best, c) => (Math.abs(c.x - cur.x) < Math.abs(best.x - cur.x) ? c : best)).id;
}

export function stepTab(current: TabId, delta: 1 | -1): TabId {
  return TABS[clamp(TABS.indexOf(current) + delta, 0, TABS.length - 1)]!;
}

export function initInventory(root: HTMLElement, opts: { reduce: boolean; onSelect?: () => void }): Inventory {
  const sections = new Map<TabId, HTMLElement>();
  const items = { relics: [], journey: [], attributes: [], contact: [] } as Record<TabId, string[]>;
  for (const sec of root.querySelectorAll<HTMLElement>('section.tab')) {
    const id = sec.dataset.tab as TabId;
    sections.set(id, sec);
    items[id] = [...sec.querySelectorAll<HTMLElement>('.item')].map(a => a.dataset.item!);
  }
  const tabLinks = [...root.querySelectorAll<HTMLAnchorElement>('.tabs a')];

  let current: Route = { tab: 'relics', item: items.relics[0] ?? null };
  let opened = false;
  let shown: TabId | null = null;
  let stopSigil = () => {};

  function showCard(sec: HTMLElement, quick: boolean): void {
    const card = sec.querySelector<HTMLElement>('.card');
    if (!card) return;
    card.classList.remove('in');
    card.classList.toggle('quick', quick);
    void card.offsetWidth; // restart the transition
    card.classList.add('in');
  }

  function render(announce: boolean): void {
    const { tab, item } = current;
    for (const [id, sec] of sections) sec.classList.toggle('active', id === tab);
    for (const a of tabLinks) {
      const on = a.dataset.tab === tab;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    }
    const sec = sections.get(tab)!;
    if (opened && shown !== tab) { showCard(sec, shown !== null); shown = tab; }

    let changed = false;
    for (const a of sec.querySelectorAll<HTMLElement>('.item')) a.classList.toggle('sel', a.dataset.item === item);
    for (const d of sec.querySelectorAll<HTMLElement>('.detail')) {
      const sel = d.dataset.item === item;
      if (sel && !d.classList.contains('sel')) changed = true;
      d.classList.toggle('sel', sel);
    }

    if (!opened) return;
    const detail = sec.querySelector<HTMLElement>('.detail.sel');
    const pre = detail?.querySelector<HTMLElement>('pre.sigil');
    if (changed || !pre?.textContent) {
      stopSigil();
      stopSigil = () => {};
      if (detail && pre) {
        stopSigil = detail.dataset.petals
          ? mountSigil(pre, { petals: Number(detail.dataset.petals), rings: Number(detail.dataset.rings) }, opts.reduce)
          : mountStatic(pre, logoGrid(rasterise(detail.dataset.path ?? null, detail.dataset.mark ?? null)), opts.reduce);
      }
      if (announce && changed) opts.onSelect?.();
    }
  }

  function go(route: Route, push = true): void {
    const same = route.tab === current.tab && route.item === current.item;
    current = route;
    if (push && !same) history.pushState(null, '', formatHash(route));
    render(push);
  }

  function open(): void {
    if (opened) return;
    opened = true;
    root.classList.add('open');
    render(false);
  }

  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    a.addEventListener('click', e => {
      const r = parseHash(a.getAttribute('href')!, items);
      if (!r) return;
      e.preventDefault();
      go(r);
    });
  }

  window.addEventListener('popstate', () => {
    const r = parseHash(location.hash, items);
    if (r) go(r, false);
  });

  window.addEventListener('keydown', e => {
    if (!opened || window.scrollY < root.offsetTop - window.innerHeight * 0.5) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const list = items[current.tab];
    const slots = sections.get(current.tab)!.querySelector('.slots');
    const vertical = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    const sideways = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    let next: Route | null = null;
    if (vertical && slots) {
      // In a grid, up and down move by row.
      const cells = [...slots.querySelectorAll<HTMLElement>('.item')].map(a => {
        const r = a.getBoundingClientRect();
        return { id: a.dataset.item!, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      next = { tab: current.tab, item: stepGrid(cells, current.item, vertical) };
    } else if (vertical) {
      next = { tab: current.tab, item: stepItem(list, current.item, vertical) };
    } else if (sideways) {
      // In a grid, left and right move along it and only change section from its two ends.
      const i = list.indexOf(current.item ?? '');
      if (slots && i + sideways >= 0 && i + sideways < list.length) {
        next = { tab: current.tab, item: list[i + sideways]! };
      } else {
        const tab = stepTab(current.tab, sideways);
        next = { tab, item: items[tab][0] ?? null };
      }
    }
    if (!next) return;
    e.preventDefault();
    go(next);
  });

  render(false);
  return { items, route: () => current, go, open };
}
```

- [ ] **Step 4: Run** `npm test` — expected PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: inventory tabs, selection, keyboard and deep links"`

---

### Task 10: Hero loop, audio and boot

**Files:**
- Create: `src/scripts/audio.ts`, `src/scripts/hero.ts`
- Modify: `src/scripts/main.ts` (replace the temporary file)
- Test: `tests/audio.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 to 9.
- Produces:
  - `audio.ts`: `interface AudioKit { on(): boolean; toggle(): boolean; bell(): void; door(): void; chime(): void }`, `createAudio(): AudioKit`, `labelFor(on: boolean): string`
  - `hero.ts`: `startHero(el, hooks, opts): { descend(): void; skip(): void }` with `el = { canvas, hero, hint, inv }`, `hooks = { onLand(natural: boolean): void; onNave(): void; onArrive(): void }`, `opts = { reduce: boolean; skip: boolean; frozenT: number | null; sOverride: number | null }`
- Debug URL parameters, used by the browser checks: `?t=<seconds>` freezes entrance time, `?s=<0..1>` overrides descent progress, `?still=1` forces reduced motion.

- [ ] **Step 1: Write the failing test**

**File:** `tests/audio.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { labelFor } from '../src/scripts/audio';

describe('audio', () => {
  it('labels the toggle', () => {
    expect(labelFor(false)).toBe('SOUND: OFF');
    expect(labelFor(true)).toBe('SOUND: ON');
  });
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL, module missing.

- [ ] **Step 3: Implement audio**

**File:** `src/scripts/audio.ts`
```ts
export interface AudioKit {
  on(): boolean;
  /** Flip sound on or off; returns the new state. Must be called from a user gesture. */
  toggle(): boolean;
  bell(): void;
  door(): void;
  chime(): void;
}

export const labelFor = (on: boolean): string => `SOUND: ${on ? 'ON' : 'OFF'}`;

const MASTER = 0.18;

/** All sound is synthesised; nothing is downloaded. Silent until toggled on. */
export function createAudio(): AudioKit {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = false;

  function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function ensure(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // wind: looped noise through a band-pass, slowly swelling
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 2);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.7;
    const wind = ctx.createGain();
    wind.gain.value = 0.32;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const depth = ctx.createGain();
    depth.gain.value = 0.16;
    lfo.connect(depth).connect(wind.gain);
    src.connect(band).connect(wind).connect(master);
    src.start();
    lfo.start();
    return ctx;
  }

  /** A sine partial with a soft attack and exponential decay. */
  function partial(freq: number, amp: number, dur: number, attack = 0.03, endFreq?: number): void {
    if (!enabled || !ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    on: () => enabled,
    toggle() {
      enabled = !enabled;
      const c = ensure();
      void c.resume();
      master!.gain.cancelScheduledValues(c.currentTime);
      master!.gain.linearRampToValueAtTime(enabled ? MASTER : 0, c.currentTime + 1.2);
      return enabled;
    },
    bell() {
      const base = 98;
      for (const [ratio, amp, dur] of [[0.5, 1, 6], [1, 0.8, 5], [1.19, 0.5, 4], [1.5, 0.35, 3.2], [2, 0.3, 2.6], [2.51, 0.18, 2], [3.01, 0.1, 1.5]] as const) {
        partial(base * ratio, amp * 0.25, dur, 0.04);
      }
    },
    door() {
      partial(60, 0.5, 0.7, 0.03, 32);
      if (!enabled || !ctx || !master) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 0.5);
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 180;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(low).connect(g).connect(master);
      src.start(t);
    },
    chime() {
      partial(784, 0.06, 0.9, 0.02);
      partial(1175, 0.04, 0.7, 0.02);
    },
  };
}
```

- [ ] **Step 4: Implement the hero loop**

**File:** `src/scripts/hero.ts`
```ts
import {
  Ash, Crows, clear, edgeColumns, flicker, fog, fromImage, glow, lantern, makeFrame, nameBand, rays, reveal, scale, stars,
  type Frame,
} from './effects';
import { FONT, makeGrid, type Grid } from './grid';
import { clamp, easeInOutCubic, smooth } from './math';
import { FrameSampler, nextNotch } from './perf';
import { paint } from './renderer';
import { DOOR, GROUND, drawExterior, roseScreen, screenY, type ExteriorView } from './scene/exterior';
import { drawNave } from './scene/nave';
import {
  DOOR_SHARE, ENTRANCE, camTop, descentProgress, doorFade, doorZoom, frontY, naveLight, phases, pushIn, roseLit,
} from './timeline';

export interface HeroElements { canvas: HTMLCanvasElement; hero: HTMLElement; hint: HTMLElement; inv: HTMLElement }
export interface HeroHooks { onLand(natural: boolean): void; onNave(): void; onArrive(): void }
export interface HeroOptions { reduce: boolean; skip: boolean; frozenT: number | null; sOverride: number | null }

const AUTO_DESCENT_MS = 7000;

export function startHero(el: HeroElements, hooks: HeroHooks, opts: HeroOptions): { descend(): void; skip(): void } {
  const { reduce } = opts;
  const ctx = el.canvas.getContext('2d')!;
  const off = document.createElement('canvas');
  const og = off.getContext('2d', { willReadFrequently: true })!;

  let notch = 0;
  let g: Grid;
  let f: Frame;
  let ash: Ash;
  const crows = new Crows();
  const sampler = new FrameSampler();

  let t0 = performance.now();
  let last = t0;
  let landed = false;
  let skipped = opts.skip;
  let arrived = false;
  let inNave = false;
  let edgeK = 0;
  let nextCrows = Infinity;
  let mx = 0, my = 0, mxn = 0, myn = 0, hasMouse = false;
  let auto = 0;
  let bandY = 0.66;

  function rebuild(): void {
    const W = window.innerWidth, H = window.innerHeight;
    g = makeGrid(ctx, W, H, notch);
    el.canvas.width = W * g.dpr;
    el.canvas.height = H * g.dpr;
    off.width = g.cols;
    off.height = g.rows;
    f = makeFrame(g);
    ash = new Ash(g, reduce ? 0 : Math.round((g.cols * g.rows) / 330));
    measureBand();
  }

  /** Where the name sits, as a fraction of viewport height, so the dimmed band follows the layout. */
  function measureBand(): void {
    const name = el.hero.querySelector('.name'), sub = el.hero.querySelector('.sub');
    if (!name || !sub || el.hero.style.transform) return;
    bandY = (name.getBoundingClientRect().top + sub.getBoundingClientRect().bottom) / 2 / window.innerHeight;
  }

  function land(natural: boolean): void {
    landed = true;
    el.hero.classList.add('in');
    window.setTimeout(() => el.hint.classList.add('in'), natural ? (ENTRANCE.hintAt - ENTRANCE.nameAt) * 1000 : 300);
    if (natural && !reduce) {
      crows.launch(g, 20);
      nextCrows = performance.now() / 1000 + 14;
    }
    hooks.onLand(natural);
  }

  function skip(): void {
    if (landed) return;
    skipped = true;
    t0 = performance.now() - 60_000;
  }

  function cancelAuto(): void {
    if (auto) { cancelAnimationFrame(auto); auto = 0; }
  }

  function descend(): void {
    if (auto) return;
    const from = window.scrollY, to = el.inv.offsetTop;
    if (reduce) { window.scrollTo(0, to); return; }
    const start = performance.now();
    const step = (now: number) => {
      const k = clamp((now - start) / AUTO_DESCENT_MS);
      window.scrollTo(0, from + (to - from) * easeInOutCubic(k));
      auto = k < 1 ? requestAnimationFrame(step) : 0;
    };
    auto = requestAnimationFrame(step);
  }

  function tick(now: number): void {
    requestAnimationFrame(tick);
    const dtMs = now - last;
    const dt = Math.min(0.05, dtMs / 1000 || 0.016);
    last = now;

    const time = reduce ? 0 : now / 1000;
    const t = opts.frozenT ?? (now - t0) / 1000;
    if (!landed && t >= ENTRANCE.nameAt) land(!skipped);

    const s = opts.sOverride ?? descentProgress(window.scrollY, window.innerHeight);
    const { door, nave } = phases(s);
    let ashB = 0;

    if (s < DOOR_SHARE) {
      const restDoorY = g.H - 1000 * g.u + DOOR.y * g.u;
      const view: ExteriorView = {
        camTop: camTop(t),
        zoom: reduce ? 1 : doorZoom(door) * pushIn(t - ENTRANCE.craneEnd),
        shift: reduce ? 0 : (g.H / 2 - restDoorY) * smooth(door * 1.6),
        frontY: frontY(t),
        roseLit: roseLit(t),
        time,
        mx: reduce ? 0 : mxn,
        my: reduce ? 0 : myn,
      };
      drawExterior(og, g, view);
      fromImage(f, og.getImageData(0, 0, g.cols, g.rows).data);
      const rose = roseScreen(g, view);
      const groundRow = screenY(g, view, GROUND) / g.ch;
      if (door < 0.6) stars(f, groundRow, time);
      if (!reduce) flicker(f, rose, time);
      rays(f, rose, view.roseLit * (1 - door), time);
      fog(f, groundRow, 1 - smooth(door * 3), time);
      lantern(f, hasMouse ? mx : rose.x, hasMouse ? my : rose.y);
      nameBand(f, landed ? 1 - smooth(door / 0.5) : 0, bandY);
      scale(f, reduce ? 1 - smooth(door) : doorFade(door));
      if (Number.isFinite(view.frontY)) reveal(f, screenY(g, view, view.frontY) / g.ch, t);
      if (t >= ENTRANCE.spiresEnd) ashB = 0.75 * doorFade(door);
      if (!reduce) {
        if (time > nextCrows && door === 0) { crows.launch(g, 2); nextCrows = time + 12 + Math.random() * 10; }
        crows.step(dt, g);
        crows.stamp(f, time);
      }
    } else if (s < 0.999) {
      if (!inNave) { inNave = true; hooks.onNave(); }
      if (reduce) {
        clear(f);
      } else {
        drawNave(og, g, { travelled: nave, time });
        fromImage(f, og.getImageData(0, 0, g.cols, g.rows).data);
        const light = naveLight(nave);
        scale(f, light.fadeIn);
        glow(f, light.glow);
        scale(f, light.out);
      }
    } else {
      clear(f);
      edgeK = Math.min(1, edgeK + dt * 0.8);
      edgeColumns(f, edgeK);
      ashB = 0.42;
    }
    if (s < DOOR_SHARE - 0.02) inNave = false;
    if (s < 0.999) edgeK = 0;

    if (!reduce) {
      ash.step(dt, time, g);
      if (ashB > 0.05) ash.stamp(f, ashB);
    }
    paint(ctx, g, f.B, f.over);

    el.hero.style.opacity = String(landed ? 1 - smooth(door / 0.5) : 0);
    el.hero.style.transform = reduce || door === 0 ? '' : `scale(${1 + door * 1.4})`;
    el.hint.style.visibility = s > 0.02 ? 'hidden' : 'visible';

    if (s >= 0.985 && !arrived) { arrived = true; hooks.onArrive(); }

    if (s < 0.999 && !document.hidden) {
      const avg = sampler.add(dtMs);
      if (avg !== null) {
        const n = nextNotch(avg, notch);
        if (n !== notch) { notch = n; rebuild(); }
      }
    }
    document.documentElement.dataset.ready = '1';
  }

  window.addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    mxn = (e.clientX / window.innerWidth) * 2 - 1;
    myn = (e.clientY / window.innerHeight) * 2 - 1;
    hasMouse = e.pointerType === 'mouse';
  });
  window.addEventListener('wheel', () => { cancelAuto(); skip(); }, { passive: true });
  window.addEventListener('touchstart', () => { cancelAuto(); skip(); }, { passive: true });
  window.addEventListener('pointerdown', () => skip());
  window.addEventListener('keydown', e => {
    if (!landed) { skip(); return; }
    if (window.scrollY < window.innerHeight * 0.2 && ['Enter', ' ', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      descend();
    }
  });
  window.addEventListener('resize', rebuild);
  el.hint.addEventListener('click', descend);

  if (opts.skip || reduce) t0 = performance.now() - 60_000;
  const fonts = document.fonts?.load ? document.fonts.load(`10px ${FONT}`) : Promise.resolve();
  const begin = () => {
    rebuild();
    if (!opts.skip && !reduce) t0 = performance.now();
    last = performance.now();
    requestAnimationFrame(tick);
  };
  void Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(begin, begin);

  return { descend, skip };
}
```

- [ ] **Step 5: Implement boot**

**File:** `src/scripts/main.ts`
```ts
import { createAudio, labelFor } from './audio';
import { startHero } from './hero';
import { initInventory, parseHash } from './inventory';

const qs = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || qs.has('still');
if (reduce) document.documentElement.classList.add('still');
history.scrollRestoration = 'manual';

const num = (key: string): number | null => (qs.has(key) ? Number(qs.get(key)) : null);
const invEl = document.getElementById('inv')!;
const audio = createAudio();
const inventory = initInventory(invEl, { reduce, onSelect: () => audio.chime() });
const deep = parseHash(location.hash, inventory.items);

startHero(
  {
    canvas: document.getElementById('ascii') as HTMLCanvasElement,
    hero: document.getElementById('hero')!,
    hint: document.getElementById('hint')!,
    inv: invEl,
  },
  {
    onLand: natural => { if (natural) audio.bell(); },
    onNave: () => audio.door(),
    onArrive: () => inventory.open(),
  },
  { reduce, skip: deep !== null, frozenT: num('t'), sOverride: num('s') },
);

if (deep) {
  // A deep link opens the inventory directly; it does not wait for the scroll position to get there.
  inventory.go(deep, false);
  inventory.open();
  const land = () => window.scrollTo(0, invEl.offsetTop);
  requestAnimationFrame(land);
  window.addEventListener('load', land, { once: true });
} else {
  window.scrollTo(0, 0);
}

const sound = document.getElementById('sound')!;
sound.addEventListener('click', () => {
  const on = audio.toggle();
  sound.textContent = labelFor(on);
  sound.setAttribute('aria-pressed', String(on));
});
```

- [ ] **Step 6: Run** `npm test` and `npm run build` — both expected to succeed.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: hero frame loop, synthesised sound and boot wiring"`

---

### Task 11: Browser checks and poster

**Files:**
- Create: `playwright.config.ts`, `e2e/site.spec.ts`, `e2e/poster.spec.ts`
- Create (generated): `public/poster.png`

**Interfaces:**
- Consumes: the debug URL parameters and DOM contract from Tasks 8 and 10.

- [ ] **Step 1: Config and specs**

**File:** `playwright.config.ts`
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4321/portfolio/', channel: 'msedge' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321/portfolio/',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testIgnore: /poster/ },
  ],
});
```

**File:** `e2e/site.spec.ts`
```ts
import { expect, test, type Page } from '@playwright/test';

const ready = (page: Page) => page.waitForFunction(() => document.documentElement.dataset.ready === '1');

/** Count of lit canvas samples and their mean red value (0..255). */
async function canvasStats(page: Page): Promise<{ lit: number; mean: number }> {
  return page.evaluate(() => {
    const c = document.querySelector('#ascii') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
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

test('keyboard moves between items and tabs and updates the URL', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation is a desktop behaviour');
  await page.goto('./#relics/jms');
  await ready(page);
  await expect(page.locator('#inv.open')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/#relics\/brainrot-lms$/);
  await expect(page.getByRole('heading', { name: 'CS203 Brainrot LMS' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#journey\/oracle$/);
  await expect(page.getByRole('heading', { name: 'Backend Developer Intern' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#attributes\/java$/);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#attributes\/python$/);
  await expect(page.getByRole('heading', { name: 'Python', level: 3 })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page).not.toHaveURL(/#attributes\/python$/);
  await page.getByRole('link', { name: 'CONTACT', exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole('link', { name: 'Download PDF' })).toBeVisible();
});

test('sigil is drawn for the selected relic', async ({ page }) => {
  await page.goto('./#relics/jms');
  await ready(page);
  await page.waitForTimeout(2500);
  const text = await page.locator('.detail.sel pre.sigil').textContent();
  expect(text!.split('\n').length).toBeGreaterThanOrEqual(21);
  expect(text).toContain('@');
});

test('attributes: a slot shows its logo in characters and where it was used', async ({ page }, info) => {
  await page.goto('./#attributes/aws');
  await ready(page);
  await page.waitForTimeout(2500);
  const mark = await page.locator('#attributes .detail.sel pre.sigil').textContent();
  expect(mark!.replace(/\s/g, '').length).toBeGreaterThan(40);

  await page.goto('./#attributes/keycloak');
  await page.reload();
  await ready(page);
  await page.waitForTimeout(2500);
  await expect(page.getByRole('heading', { name: 'Keycloak', level: 3 })).toBeVisible();
  await expect(page.locator('#attributes .detail.sel .used a')).toHaveText(['JMS', 'Brainrot LMS']);
  const logo = await page.locator('#attributes .detail.sel pre.sigil').textContent();
  expect(logo!.replace(/\s/g, '').length).toBeGreaterThan(60);
  await shot(page, 'attributes', info.project.name);
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
  await expect(page.getByRole('heading', { name: 'Java', level: 3 })).toBeVisible();
});

test('phone number never appears', async ({ page }) => {
  await page.goto('./');
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
```

**File:** `e2e/poster.spec.ts`
```ts
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
```

- [ ] **Step 2: Install the browser and capture the poster**

Run: `npm run poster` (the checks drive the installed Microsoft Edge, so no browser download is needed)
Expected: `public/poster.png` exists and shows the cathedral.

- [ ] **Step 3: Run all browser checks**

Run: `npm run e2e`
Expected: all tests pass on `desktop` and `phone`. Review the images in `e2e-shots/` by eye: entrance, hero, door, nave and inventory for each.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "test: browser checks and no-JavaScript poster"`

---

### Task 12: Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Workflow and readme**

**File:** `.github/workflows/deploy.yml`
```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**File:** `README.md`
```md
# Portfolio

Ahmad Dzaki's portfolio: an ASCII cathedral you walk through to reach an inventory of projects.

## Commands

- `npm run dev` starts a local server at http://localhost:4321/portfolio/
- `npm test` runs the unit tests
- `npm run e2e` builds the site and runs the browser checks; screenshots land in `e2e-shots/`
- `npm run poster` regenerates `public/poster.png`, the hero image shown when JavaScript is off

## Adding a project

Add a Markdown file to `src/content/relics/`. Copy an existing one and change the fields. `order` sets its place in the list; `sigil.petals` and `sigil.rings` set the shape of its emblem. Use an even number of petals so the emblem is symmetric.

## Debug parameters

- `?t=4` freezes the entrance at 4 seconds
- `?s=0.65` jumps to 65% of the descent
- `?still=1` forces reduced motion

## Documents

- Design: `docs/superpowers/specs/2026-11-10-portfolio-design.md`
- Plan: `docs/superpowers/plans/2026-11-10-portfolio.md`
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "ci: deploy to GitHub Pages"`

- [ ] **Step 3: Publish (owner action, needs explicit go-ahead)**

Creating the public GitHub repository and pushing makes the site and the résumé PDF public. Do not run these without the owner's confirmation:

```bash
gh repo create portfolio --public --source . --push
gh api -X POST repos/Dzakiki/portfolio/pages -f build_type=workflow
```

Expected: the Deploy workflow runs and the site is served at `https://dzakiki.github.io/portfolio/`.

---

## Spec coverage

| Spec section | Task |
|---|---|
| 3 Structure, deep links | 8, 9, 10 |
| 4 Hero scene and additions | 4, 5 |
| 4 Entrance sequence, ambient motion, text | 2, 5, 8, 10 |
| 5 Descent, door and nave | 2, 6, 10 |
| 6 Inventory, title cards, frame, tabs, navigation | 8, 9 |
| 6 Sigils | 7, 9 |
| 7 Content | 8 |
| 8 Visual system | 3, 8 |
| 9 Motion rules, reduced motion, sound | 2, 5, 10, 11 |
| 10 Accessibility and fallbacks | 8, 11 |
| 11 Performance | 3, 10 |
| 12 Build and testing | 1, 11, 12 |

## Changes made after this plan was written

The plan above is the original build. These later changes were made directly and are recorded in the spec and in git history, not in the task code blocks:

- Attributes became a wall of tiles showing every technology at once, with one large ASCII logo cycling (`src/scripts/altar.ts`, `src/data/attributes.ts`).
- The 2D sigils were replaced by turning 3D relics (`src/scripts/relic3d.ts`); `sigil.ts` now holds only logo rendering and the assembly animation.
- The inventory gained a chamber backdrop (`src/scripts/scene/chamber.ts`), replacing the edge columns.
- Journey became an all-visible timeline; Contact gained a swinging bell; tabs open like doors.
- The entrance now plays once per visit, with a skip hint; an about tagline and bio were added (`src/data/about.ts`); the page gained link-preview tags, a tab icon and a not-found page.
- Journey became the first tab. Relics became a reliquary: a shared 60 by 40 stage with plinth, light shaft, embers and pointer-driven turning (`renderStage`, `createStage` in `relic3d.ts`), with four alcoves beneath.
- The flat drawn scenes were replaced by a real 3D world (`src/scripts/scene3d/`: `build.ts`, `path.ts`, `world.ts`) using three.js, still converted to characters. Outlines come from a second render of surface directions. The inventory now sits at the crossing and each tab turns the camera.
- All crosses were removed. The tab bar became a solid, bordered, sticky bar.
- Relics became real 3D models chosen to fit each project (cauldron, tome, owl, mask), with captions. Text is drawn on the graphics card (`scene3d/screen.ts`) and read-back is asynchronous. Choosing a project no longer scrolls the page.
- Before deployment: Astro and the test tools were upgraded to current majors (audit clean), a Content Security Policy was added, the site address became configurable, and the browser checks were pointed at a production build.
