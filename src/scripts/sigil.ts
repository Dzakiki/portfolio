import { clamp, hash } from './math';
import { RAMP } from './renderer';

/** Size of an ASCII logo, in characters. */
export const SW = 43;
export const SH = 21;

/** A frame of the assembly animation: cells resolve outward from the centre as k goes 0 to 1. */
export function assemble(target: string[], k: number, rnd: () => number): string[] {
  const t = clamp(k);
  const h = target.length;
  return target.map((row, y) => {
    const w = row.length;
    let out = '';
    for (let x = 0; x < w; x++) {
      const r = Math.hypot((x - (w - 1) / 2) / ((w - 1) / 2), (y - (h - 1) / 2) / ((h - 1) / 2));
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

/** A character cell is this many times taller than it is wide, as the logo is styled. */
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
    const k = (now - start) / 900;
    pre.textContent = assemble(target, k, Math.random).join('\n');
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
