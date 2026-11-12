import { lerp, smooth } from '../math';

export type V3 = [number, number, number];

/** Where the camera is and what it looks at, in metres. The facade faces +z; the nave runs toward -z. */
export interface Pose { pos: V3; look: V3 }

/** The crossing, where the nave meets the transepts and the inventory is shown. */
export const CROSSING_Z = -97;
/** The far wall, with the great window. */
export const APSE_Z = -115;

/** High, level with the spire tips: where the entrance begins. */
export const HIGH: Pose = { pos: [0, 62, 46], look: [0, 60, 0] };
/** Standing before the facade, looking up at the rose window: where the entrance ends. */
export const REST: Pose = { pos: [0, 6, 52], look: [0, 22, 0] };
/** On the threshold of the great door. */
const DOOR: Pose = { pos: [0, 3.4, 3], look: [0, 6, -40] };

const EYE = 4;
const REACH = 18;

const mix = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Entrance: `crane` 0..1 lowers the camera from HIGH to REST; `push` (1..1.04) is the slow dolly-in afterwards. */
export function entrancePose(crane: number, push: number): Pose {
  const pos = mix(HIGH.pos, REST.pos, crane);
  pos[2] -= (push - 1) * 120;
  return { pos, look: mix(HIGH.look, REST.look, crane) };
}

/** Looking out from the crossing. `yaw` 0 faces the great window; positive turns right. */
export function chamberPose(yaw: number, pitch: number): Pose {
  return {
    pos: [0, EYE, CROSSING_Z],
    look: [Math.sin(yaw) * REACH, EYE + 7 + pitch * REACH, CROSSING_Z - Math.cos(yaw) * REACH],
  };
}

/**
 * Descent: `door` 0..1 walks from the resting view to the threshold, then `nave` 0..1 travels
 * the nave to the crossing. Ends exactly at chamberPose(0, 0).
 */
export function descentPose(door: number, nave: number, push: number): Pose {
  const start = entrancePose(1, push);
  if (nave <= 0) {
    return { pos: mix(start.pos, DOOR.pos, smooth(door)), look: mix(start.look, DOOR.look, smooth(door * 1.3)) };
  }
  const z = lerp(DOOR.pos[2], CROSSING_Z, nave);
  const end = chamberPose(0, 0);
  const settle = smooth((nave - 0.8) / 0.2);
  const y = lerp(DOOR.pos[1], EYE, nave) + 0.06 * Math.sin(z * 0.9) * (1 - settle);
  const ahead: V3 = [0, lerp(DOOR.look[1], end.look[1], nave), Math.max(z - 43, APSE_Z)];
  return { pos: [0, y, z], look: mix(ahead, end.look, settle) };
}

/** The direction the camera faces at the crossing for each tab, in radians. */
export const TAB_YAW: Record<string, number> = {
  journey: 0,
  relics: -0.72,
  attributes: 0.72,
  contact: Math.PI,
};
