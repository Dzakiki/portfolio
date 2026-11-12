import { describe, expect, it } from 'vitest';
import { APSE_Z, CROSSING_Z, HIGH, REST, TAB_YAW, chamberPose, descentPose, entrancePose } from '../src/scripts/scene3d/path';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 5));

describe('camera path', () => {
  it('starts high and ends at the resting view', () => {
    close(entrancePose(0, 1).pos, HIGH.pos);
    close(entrancePose(1, 1).pos, REST.pos);
    close(entrancePose(1, 1).look, REST.look);
  });
  it('pushes in gently after resting', () => {
    expect(entrancePose(1, 1.04).pos[2]).toBeLessThan(REST.pos[2]);
    expect(REST.pos[2] - entrancePose(1, 1.04).pos[2]).toBeLessThan(6);
  });
  it('the descent begins exactly where the entrance left off', () => {
    close(descentPose(0, 0, 1.02).pos, entrancePose(1, 1.02).pos);
    close(descentPose(0, 0, 1.02).look, entrancePose(1, 1.02).look);
  });
  it('walks to the door, then moves steadily down the nave', () => {
    expect(descentPose(1, 0, 1).pos[2]).toBeCloseTo(3);
    let prev = descentPose(1, 0, 1).pos[2];
    for (let n = 0.05; n <= 1; n += 0.05) {
      const z = descentPose(1, n, 1).pos[2];
      expect(z).toBeLessThan(prev);
      prev = z;
    }
  });
  it('stays at walking height and on the centre line throughout the nave', () => {
    for (let n = 0; n <= 1; n += 0.1) {
      const p = descentPose(1, n, 1).pos;
      expect(p[0]).toBe(0);
      expect(p[1]).toBeGreaterThan(3);
      expect(p[1]).toBeLessThan(4.5);
    }
  });
  it('never looks beyond the far wall', () => {
    for (let n = 0; n <= 1; n += 0.05) expect(descentPose(1, n, 1).look[2]).toBeGreaterThanOrEqual(APSE_Z - 1e-6);
  });
  it('arrives exactly at the crossing, facing the great window', () => {
    const end = descentPose(1, 1, 1), chamber = chamberPose(0, 0);
    close(end.pos, chamber.pos);
    close(end.look, chamber.look);
    expect(chamber.pos[2]).toBe(CROSSING_Z);
    expect(chamber.look[2]).toBeCloseTo(APSE_Z);
  });
  it('faces a different way for each tab', () => {
    const looks = Object.values(TAB_YAW).map(y => chamberPose(y, 0).look.map(v => v.toFixed(2)).join());
    expect(new Set(looks).size).toBe(4);
    expect(chamberPose(TAB_YAW.contact!, 0).look[2]).toBeGreaterThan(CROSSING_Z);
    expect(chamberPose(TAB_YAW.relics!, 0).look[0]).toBeLessThan(0);
    expect(chamberPose(TAB_YAW.attributes!, 0).look[0]).toBeGreaterThan(0);
  });
});
