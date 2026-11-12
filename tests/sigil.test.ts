import { describe, expect, it } from 'vitest';
import { SH, SW, assemble, logoGrid } from '../src/scripts/sigil';

describe('logo', () => {
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

describe('assemble', () => {
  const target = ['@@@@@@@', '@@@@@@@', '@@@@@@@', '@@@@@@@', '@@@@@@@'];
  const rnd = () => 0.9;
  it('reaches the exact target at the end', () => {
    expect(assemble(target, 1, rnd)).toEqual(target);
    expect(assemble(target, 5, rnd)).toEqual(target);
  });
  it('starts away from the target and keeps the grid size', () => {
    const first = assemble(target, 0, rnd);
    expect(first).not.toEqual(target);
    expect(first).toHaveLength(target.length);
    for (const row of first) expect(row).toHaveLength(7);
  });
  it('resolves the centre before the edges', () => {
    const mid = assemble(target, 0.3, rnd);
    expect(mid[2]![3]).toBe('@');
    expect(mid[0]![0]).toBe(' ');
  });
});
