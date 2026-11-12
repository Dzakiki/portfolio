export interface Grid {
  W: number; H: number; dpr: number;
  fs: number; cw: number; ch: number;
  cols: number; rows: number;
}

export const FONT = '"JetBrains Mono", monospace';

export function fontSizeFor(W: number, notch: number): number {
  return (W < 700 ? 8 : W < 1300 ? 9 : 10) + notch;
}

let scratch: CanvasRenderingContext2D | null = null;

/**
 * Lay out the character grid for a W by H viewport. Cells are a whole number of device pixels,
 * so glyphs land on pixel boundaries and stay sharp.
 */
export function makeGrid(W: number, H: number, notch: number): Grid {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fs = fontSizeFor(W, notch);
  scratch ??= document.createElement('canvas').getContext('2d')!;
  scratch.font = `${fs}px ${FONT}`;
  const cw = Math.round((scratch.measureText('MMMMMMMMMM').width / 10) * dpr) / dpr;
  const ch = Math.round(fs * 1.3 * dpr) / dpr;
  return { W, H, dpr, fs, cw, ch, cols: Math.ceil(W / cw) + 1, rows: Math.ceil(H / ch) + 1 };
}
