import * as THREE from 'three';

let renderer: THREE.WebGLRenderer | null | undefined;
let visible: HTMLCanvasElement | null = null;

/** Name the canvas the visitor sees. Must be called before anything first asks for the renderer. */
export function useCanvas(canvas: HTMLCanvasElement): void {
  visible = canvas;
}

/**
 * The one WebGL renderer the site uses. The cathedral and the relics are drawn into small
 * off-screen targets with it, and the character grid is drawn to its canvas. Null without WebGL.
 */
export function sharedRenderer(): THREE.WebGLRenderer | null {
  if (renderer !== undefined) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: visible ?? document.createElement('canvas'), antialias: false, powerPreference: 'high-performance',
      // lets the finished picture be copied out (poster capture, browser checks)
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
  } catch {
    renderer = null;
  }
  return renderer;
}

/**
 * A render target twice as wide as the picture: the lit view goes in the left half and the
 * surface directions (for outlines) in the right half, so one read-back fetches both.
 */
export function pairTarget(w: number, h: number): THREE.WebGLRenderTarget {
  const t = new THREE.WebGLRenderTarget(w * 2, h, { samples: 4 });
  t.scissorTest = true;
  return t;
}

/** Draw `scene` into one half of a pair target. `half` 0 is the lit view, 1 the surface directions. */
export function drawHalf(
  r: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, half: 0 | 1, scene: THREE.Scene, camera: THREE.Camera,
): void {
  const w = target.width / 2;
  target.viewport.set(half * w, 0, w, target.height);
  target.scissor.set(half * w, 0, w, target.height);
  r.setRenderTarget(target);
  r.render(scene, camera);
}

/** Split a pair read-back (rows of 2w pixels) into its two halves. */
export function splitPair(raw: Uint8Array, w: number, h: number, lit: Uint8Array, facing: Uint8Array): void {
  const rowBytes = w * 4;
  for (let y = 0; y < h; y++) {
    const src = y * rowBytes * 2;
    lit.set(raw.subarray(src, src + rowBytes), y * rowBytes);
    facing.set(raw.subarray(src + rowBytes, src + rowBytes * 2), y * rowBytes);
  }
}
