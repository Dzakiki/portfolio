export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);

export const smooth = (v: number): number => {
  const c = clamp(v);
  return c * c * (3 - 2 * c);
};

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export const easeInOutCubic = (k: number): number =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
