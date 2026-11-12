import { clamp, smooth } from './math';

/** Entrance milestones, in seconds from page start. */
export const ENTRANCE = { rainEnd: 0.8, spiresEnd: 2.5, craneEnd: 6.5, nameAt: 6.8, hintAt: 8.7 } as const;

/** The descent occupies this many viewport heights of scroll. */
export const DESCENT_VH = 4;

/** Share of the descent spent walking up to the door; the rest is the nave. */
export const DOOR_SHARE = 0.35;

/** How far the camera has craned down from the spire tips to the resting view, 0..1. */
export function crane(t: number): number {
  return smooth((t - ENTRANCE.spiresEnd) / (ENTRANCE.craneEnd - ENTRANCE.spiresEnd));
}

/** How much of the screen has been carved out of the falling characters, top to bottom, 0..1. */
export function revealK(t: number): number {
  if (t >= ENTRANCE.craneEnd) return 1;
  return Math.min(0.999, smooth((t - ENTRANCE.rainEnd) / (ENTRANCE.craneEnd - 0.4 - ENTRANCE.rainEnd)));
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

/** 0 outside, 1 inside: rises as the camera crosses the threshold. */
export function insideness(door: number, nave: number): number {
  return clamp(smooth((door - 0.8) / 0.2) * 0.5 + smooth(nave / 0.12) * 0.5);
}
