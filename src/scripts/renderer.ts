export const RAMP = ' .:-=+*#%@';
export const ALPHAS = [0.36, 0.58, 0.8, 1] as const;
export const BLANK = 0.045;

/** Every character the grid can show: the brightness ramp, then the extras used by ash and crows. */
export const GLYPHS = RAMP + "'`,\\v/";

const INDEX = new Uint8Array(128);
for (let i = 0; i < GLYPHS.length; i++) INDEX[GLYPHS.charCodeAt(i)] = i;

export function charFor(b: number): string {
  if (b < BLANK) return ' ';
  return RAMP[Math.min(9, 1 + ((Math.pow(Math.min(b, 1), 0.82) * 9) | 0))]!;
}

export function levelFor(b: number): 0 | 1 | 2 | 3 {
  return b < 0.2 ? 0 : b < 0.45 ? 1 : b < 0.72 ? 2 : 3;
}

/** Position of a character in GLYPHS; unknown characters come out as a space. */
export function glyphIndex(char: string): number {
  const code = char.charCodeAt(0);
  return code < 128 ? INDEX[code]! : 0;
}

/**
 * Describe each cell for the screen shader, four bytes per cell: which glyph, how opaque
 * (one of the four ALPHAS steps), and two unused. `over` holds a character code to show
 * instead of the one brightness would pick, or 0.
 */
export function fillCells(B: Float32Array, over: Uint8Array, out: Uint8Array): void {
  for (let i = 0; i < B.length; i++) {
    const b = B[i]!;
    const o = i * 4;
    if (b < BLANK) { out[o] = 0; out[o + 1] = 0; continue; }
    const code = over[i]!;
    out[o] = code && code < 128 ? INDEX[code]! : Math.min(9, 1 + ((Math.pow(Math.min(b, 1), 0.82) * 9) | 0));
    out[o + 1] = Math.round(ALPHAS[levelFor(b)] * 255);
  }
}
