import { describe, expect, it } from 'vitest';
import { fontSizeFor } from '../src/scripts/grid';
import { FrameSampler, nextNotch } from '../src/scripts/perf';
import { ALPHAS, BLANK, GLYPHS, RAMP, charFor, fillCells, glyphIndex, levelFor } from '../src/scripts/renderer';

describe('renderer', () => {
  it('uses the exact ramp, and the glyph set begins with it', () => {
    expect(RAMP).toBe(' .:-=+*#%@');
    expect(GLYPHS.startsWith(RAMP)).toBe(true);
    expect(new Set(GLYPHS).size).toBe(GLYPHS.length);
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
  it('finds every glyph, and treats unknown characters as a space', () => {
    for (let i = 0; i < GLYPHS.length; i++) expect(glyphIndex(GLYPHS[i]!)).toBe(i);
    expect(glyphIndex('Z')).toBe(0);
    expect(glyphIndex('é')).toBe(0);
  });
  it('describes each cell as a glyph and an opacity', () => {
    const B = new Float32Array([0, 0.1, 0.3, 0.6, 1]);
    const out = new Uint8Array(B.length * 4);
    fillCells(B, new Uint8Array(B.length), out);
    expect([out[0], out[1]]).toEqual([0, 0]);
    for (let i = 1; i < 5; i++) {
      expect(GLYPHS[out[i * 4]!]).toBe(charFor(B[i]!));
      expect(out[i * 4 + 1]).toBe(Math.round(ALPHAS[levelFor(B[i]!)] * 255));
    }
    expect(GLYPHS[out[16]!]).toBe('@');
    expect(out[17]).toBe(255);
  });
  it('honours character overrides, but never on blank cells', () => {
    const B = new Float32Array([0.9, 0]);
    const over = new Uint8Array(['v'.charCodeAt(0), 'v'.charCodeAt(0)]);
    const out = new Uint8Array(8);
    fillCells(B, over, out);
    expect(GLYPHS[out[0]!]).toBe('v');
    expect(out[5]).toBe(0);
  });
});

describe('grid', () => {
  it('picks smaller characters on narrow screens and coarsens by notch', () => {
    expect(fontSizeFor(390, 0)).toBe(8);
    expect(fontSizeFor(1600, 0)).toBe(10);
    expect(fontSizeFor(1600, 2)).toBe(12);
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
