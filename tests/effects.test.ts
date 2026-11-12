import { describe, expect, it } from 'vitest';
import {
  Ash, Crows, clear, fromImage, lantern, outline, makeFrame, nameBand, reveal, scale,
} from '../src/scripts/effects';
import type { Grid } from '../src/scripts/grid';

const g: Grid = { W: 120, H: 130, dpr: 1, fs: 10, cw: 6, ch: 13, cols: 20, rows: 10 };
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
  it('fromImage can read rows bottom-up and lift mid-tones', () => {
    const f = makeFrame(g, half);
    const data = new Uint8ClampedArray(g.cols * g.rows * 4);
    data[0] = 64; // first pixel of the bottom row as WebGL returns it
    fromImage(f, data, true, 0.5);
    const bottomLeft = (g.rows - 1) * g.cols;
    expect(f.B[bottomLeft]).toBeCloseTo(Math.sqrt(64 / 255), 5);
    expect(f.B[0]).toBe(0);
  });
  it('outline brightens cells where neighbours face different ways, and nowhere else', () => {
    const f = frame(0.1);
    const facing = new Uint8ClampedArray(g.cols * g.rows * 4).fill(128);
    // a vertical boundary at column 10: everything to its right faces another way
    for (let y = 0; y < g.rows; y++) for (let x = 10; x < g.cols; x++) facing[(y * g.cols + x) * 4] = 255;
    outline(f, facing, false, 0.8);
    expect(f.B[3 * g.cols + 9]).toBeCloseTo(0.8);
    expect(f.B[3 * g.cols + 4]).toBeCloseTo(0.1);
    expect(f.B[3 * g.cols + 14]).toBeCloseTo(0.1);
  });
  it('lantern fades out with k', () => {
    const f = frame();
    lantern(f, 0, 0, 0);
    expect(f.B[0]).toBeCloseTo(0.5);
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
