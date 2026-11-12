import type { Grid } from './grid';
import { smooth } from './math';
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

/**
 * Load brightness from an RGBA image, one pixel per cell, adding grain to non-black cells.
 * `flip` reads the rows bottom-up (as WebGL returns them); `gamma` below 1 lifts the mid-tones.
 */
export function fromImage(f: Frame, data: ArrayLike<number>, flip = false, gamma = 1): void {
  const { g, B, noise } = f;
  for (let y = 0; y < g.rows; y++) {
    const src = (flip ? g.rows - 1 - y : y) * g.cols;
    for (let x = 0; x < g.cols; x++) {
      const i = y * g.cols + x;
      let b = data[(src + x) * 4]! / 255;
      if (gamma !== 1) b = Math.pow(b, gamma);
      if (b > 0.02) b += (noise[i]! - 0.5) * 0.11;
      B[i] = b;
    }
  }
  f.over.fill(0);
}

/**
 * Draw outlines. `facing` holds, per cell, the direction each surface faces as colour (rows
 * bottom-up when `flip`). Where neighbouring cells face different ways, or one is empty sky,
 * there is an edge, and the cell is lifted to at least `strength`.
 */
export function outline(f: Frame, facing: ArrayLike<number>, flip: boolean, strength: number): void {
  if (strength <= 0) return;
  const { g, B } = f;
  for (let y = 0; y < g.rows - 1; y++) {
    const row = (flip ? g.rows - 1 - y : y) * g.cols;
    const below = (flip ? g.rows - 2 - y : y + 1) * g.cols;
    for (let x = 0; x < g.cols - 1; x++) {
      const a = (row + x) * 4, r = (row + x + 1) * 4, d = (below + x) * 4;
      const diff = Math.max(
        Math.abs(facing[a]! - facing[r]!), Math.abs(facing[a + 1]! - facing[r + 1]!), Math.abs(facing[a + 2]! - facing[r + 2]!),
        Math.abs(facing[a]! - facing[d]!), Math.abs(facing[a + 1]! - facing[d + 1]!), Math.abs(facing[a + 2]! - facing[d + 2]!),
      ) / 255;
      if (diff < 0.1) continue;
      const i = y * g.cols + x;
      B[i] = Math.max(B[i]!, strength * Math.min(1, diff * 3.2));
    }
  }
}

/** The scene sits slightly dim and brightens in a soft circle around (lx, ly) in px. `k` fades the effect out. */
export function lantern(f: Frame, lx: number, ly: number, k = 1): void {
  if (k <= 0) return;
  const { g, B } = f;
  const lr = g.H * 0.24;
  for (let y = 0; y < g.rows; y++) {
    const dy = (y * g.ch - ly) / lr;
    for (let x = 0; x < g.cols; x++) {
      const dx = (x * g.cw - lx) / lr;
      B[y * g.cols + x]! *= 1 + k * (0.85 * Math.exp(-(dx * dx + dy * dy) * 2.4) - 0.3);
    }
  }
}

/** Dim the band behind the name by up to half. `centre` and `half` are its middle and half-height as fractions of the viewport. */
export function nameBand(f: Frame, k: number, centre = 0.66, half = 0.13): void {
  if (k <= 0) return;
  const { g, B } = f;
  for (let y = 0; y < g.rows; y++) {
    const band = k * 0.5 * smooth(1 - Math.abs((y * g.ch) / g.H - centre) / half);
    if (band <= 0) continue;
    for (let x = 0; x < g.cols; x++) B[y * g.cols + x]! *= 1 - band;
  }
}

export function scale(f: Frame, k: number): void {
  if (k >= 1) return;
  const { B } = f;
  for (let i = 0; i < B.length; i++) B[i] = B[i]! * k;
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
