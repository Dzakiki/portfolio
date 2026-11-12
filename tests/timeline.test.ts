import { describe, expect, it } from 'vitest';
import {
  DOOR_SHARE, ENTRANCE, crane, descentProgress, insideness, phases, pushIn, revealK, roseLit,
} from '../src/scripts/timeline';

describe('entrance', () => {
  it('cranes from the spire tips down to the resting view', () => {
    expect(crane(0)).toBe(0);
    expect(crane(ENTRANCE.spiresEnd)).toBe(0);
    expect(crane(ENTRANCE.craneEnd)).toBe(1);
    expect(crane(99)).toBe(1);
  });
  it('only ever cranes downward', () => {
    let prev = 0;
    for (let t = 0; t <= 8; t += 0.1) {
      expect(crane(t)).toBeGreaterThanOrEqual(prev);
      prev = crane(t);
    }
  });
  it('carves the screen progressively and finishes when the crane ends', () => {
    expect(revealK(0)).toBe(0);
    expect(revealK(3)).toBeGreaterThan(0);
    expect(revealK(3)).toBeLessThan(1);
    expect(revealK(ENTRANCE.craneEnd - 0.01)).toBeLessThan(1);
    expect(revealK(ENTRANCE.craneEnd)).toBe(1);
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
  it('splits into the walk to the door, then the nave', () => {
    expect(phases(0)).toEqual({ door: 0, nave: 0 });
    expect(phases(DOOR_SHARE / 2)).toEqual({ door: 0.5, nave: 0 });
    expect(phases(DOOR_SHARE).door).toBe(1);
    expect(phases(1)).toEqual({ door: 1, nave: 1 });
    expect(phases((1 + DOOR_SHARE) / 2).nave).toBeCloseTo(0.5);
  });
  it('is outside before the door and inside once in the nave', () => {
    expect(insideness(0, 0)).toBe(0);
    expect(insideness(0.5, 0)).toBe(0);
    expect(insideness(1, 0)).toBeCloseTo(0.5);
    expect(insideness(1, 0.2)).toBe(1);
    expect(insideness(1, 1)).toBe(1);
  });
});
