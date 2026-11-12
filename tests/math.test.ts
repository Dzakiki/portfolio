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
