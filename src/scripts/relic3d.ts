import * as THREE from 'three';
import { hash } from './math';
import { RAMP } from './renderer';
import { drawHalf, pairTarget, sharedRenderer, splitPair } from './scene3d/gl';
import { SHAPES, buildPlinth, buildRelic, type RelicShape } from './scene3d/relics';
import { assemble } from './sigil';

export { SHAPES, type RelicShape };

/** Size of a relic shown on its own, in characters. */
export const RW = 92;
export const RH = 62;
/** Size of the Relics stage (relic, plinth and light), in characters. */
export const STAGE_W = 120;
export const STAGE_H = 72;
/** A character cell is this many times taller than it is wide, as relics are styled. */
const CELL_ASPECT = 1.87;
/** A blank cell that belongs to the object (a hollow or deep shadow), as opposed to empty space around it. */
export const SOLID = ' ';
/** Half the height of the stage view, in the relic's own units. */
const STAGE_R = 1.3;

/**
 * Turn a rendered relic into rows of characters. `lit` holds brightness and `facing` the
 * direction each surface faces, both bottom-up, four bytes per pixel. Brightness picks the
 * character; wherever neighbouring cells face different ways an outline is drawn.
 */
export function rowsFrom(lit: ArrayLike<number>, facing: ArrayLike<number>, w: number, h: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w;
    const below = (h - 2 - y) * w;
    let row = '';
    for (let x = 0; x < w; x++) {
      const a = (src + x) * 4;
      let b = Math.pow(lit[a]! / 255, 0.8);
      let diff = 0;
      if (x + 1 < w) {
        const r = a + 4;
        diff = Math.max(Math.abs(facing[a]! - facing[r]!), Math.abs(facing[a + 1]! - facing[r + 1]!), Math.abs(facing[a + 2]! - facing[r + 2]!));
      }
      if (y + 1 < h) {
        const d = (below + x) * 4;
        diff = Math.max(diff, Math.abs(facing[a]! - facing[d]!), Math.abs(facing[a + 1]! - facing[d + 1]!), Math.abs(facing[a + 2]! - facing[d + 2]!));
      }
      diff /= 255;
      if (diff >= 0.1) b = Math.max(b, 0.92 * Math.min(1, diff * 3.2));
      if (b >= 0.05) row += RAMP[1 + ((Math.min(b, 1) * 8.99) | 0)];
      // a dark part of the object stays empty but is marked solid, so nothing is drawn through it
      else row += facing[a]! + facing[a + 1]! + facing[a + 2]! > 0 ? SOLID : ' ';
    }
    rows.push(row);
  }
  return rows;
}

/** The shaft of light on the stage: what to draw in an empty cell at time `t` seconds. */
export function beamChar(x: number, y: number, t: number): string {
  const ax = STAGE_W / (STAGE_H * CELL_ASPECT);
  const u = ((2 * (x + 0.5)) / STAGE_W - 1) * STAGE_R * ax;
  const v = (1 - (2 * (y + 0.5)) / STAGE_H) * STAGE_R;
  const edge = 1 - Math.abs(u) / (0.14 + (STAGE_R - v) * 0.2);
  if (v <= -0.92 || edge <= 0 || Math.sin(x * 1.7 + y * 0.9 + t * 1.5) <= -0.25) return ' ';
  return edge > 0.6 ? ':' : edge > 0.2 || hash(x, y) < 0.4 ? '.' : ' ';
}

interface RelicView { angle: number; w: number; h: number; stage: boolean; lift: number; swing: number }

interface RelicGL { render(shape: RelicShape, v: RelicView): string[] }

let gl: RelicGL | null | undefined;

/** The relic renderer: real 3D, drawn small on the shared renderer and turned into characters. */
function relicGL(): RelicGL | null {
  if (gl !== undefined) return gl;
  const renderer = sharedRenderer();
  if (!renderer) return (gl = null);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-0.55, 0.75, 0.7);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.16));
  const holder = new THREE.Group();
  const plinth = buildPlinth();
  scene.add(holder, plinth);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, 5 * Math.sin(0.3), 5 * Math.cos(0.3));
  camera.lookAt(0, 0, 0);
  const facingMat = new THREE.MeshNormalMaterial();
  const built = new Map<RelicShape, THREE.Group>();

  let w = 0, h = 0;
  let target = pairTarget(2, 2);
  let raw = new Uint8Array(0), lit = new Uint8Array(0), facing = new Uint8Array(0);

  return (gl = {
    render(shape, v) {
      if (v.w !== w || v.h !== h) {
        w = v.w; h = v.h;
        target.dispose();
        target = pairTarget(w, h);
        raw = new Uint8Array(w * 2 * h * 4);
        lit = new Uint8Array(w * h * 4);
        facing = new Uint8Array(w * h * 4);
      }
      let relic = built.get(shape);
      if (!relic) { relic = buildRelic(shape); built.set(shape, relic); }
      holder.clear();
      holder.add(relic);
      holder.rotation.y = v.angle;
      holder.scale.setScalar(v.stage ? 0.92 : 1);
      holder.position.y = v.stage ? v.lift : 0;
      const swing = relic.userData.swing as THREE.Object3D | undefined;
      if (swing) swing.rotation.z = v.swing;
      plinth.visible = v.stage;

      const R = v.stage ? STAGE_R : 1.12;
      const ax = w / (h * CELL_ASPECT);
      camera.left = -R * ax; camera.right = R * ax; camera.top = R; camera.bottom = -R;
      camera.updateProjectionMatrix();

      drawHalf(renderer, target, 0, scene, camera);
      scene.overrideMaterial = facingMat;
      drawHalf(renderer, target, 1, scene, camera);
      scene.overrideMaterial = null;
      renderer.readRenderTargetPixels(target, 0, 0, w * 2, h, raw);
      renderer.setRenderTarget(null);
      splitPair(raw, w, h, lit, facing);
      return rowsFrom(lit, facing, w, h);
    },
  });
}

const blank = (w: number, h: number) => Array.from({ length: h }, () => ' '.repeat(w));

/** A relic on its own, turned by `angle` radians, as h rows of w characters. Blank without WebGL. */
export function renderRelic(shape: RelicShape, angle: number, w = RW, h = RH, swing = 0): string[] {
  return relicGL()?.render(shape, { angle, w, h, stage: false, lift: 0, swing }) ?? blank(w, h);
}

/** Assemble a lone relic into `pre`, then keep it moving. Returns a function that stops it. */
export function mountRelic(pre: HTMLElement, shape: RelicShape, reduce: boolean): () => void {
  if (reduce) {
    pre.textContent = renderRelic(shape, 0.3).join('\n');
    return () => {};
  }
  const start = performance.now();
  const draw = () => {
    const t = (performance.now() - start) / 1000;
    // the bell is round, so it rocks from its beam instead of turning
    const rows = shape === 'bell'
      ? renderRelic(shape, 0.3 * Math.sin(t * 0.45), RW, RH, 0.3 * Math.sin(t * 1.9))
      : renderRelic(shape, 0.34 * Math.sin(t * 0.6));
    pre.textContent = (t < 1.1 ? assemble(rows, t / 1.1, Math.random) : rows).join('\n');
  };
  draw();
  const timer = window.setInterval(() => { if (!document.hidden) draw(); }, 50);
  return () => clearInterval(timer);
}

/**
 * Drive the Relics stage: the relic floats and turns above a plinth in a shaft of light, with
 * embers rising. `show` swaps the relic: the old one dissolves, the new one assembles. Moving
 * the pointer across the stage turns the relic. Draws only while `isActive()` is true.
 */
export function createStage(pre: HTMLElement, reduce: boolean, isActive: () => boolean): { show(shape: RelicShape): void } {
  let shape: RelicShape | null = null;
  let next: RelicShape | null = null;
  let phase: 'idle' | 'out' | 'in' = 'idle';
  let phaseAt = 0;
  let yaw = 0, yawTarget = 0;
  const start = performance.now();
  const embers = Array.from({ length: 34 }, (_, i) => ({
    x: STAGE_W / 2 + (hash(i, 1) - 0.5) * 48, y: hash(i, 2) * STAGE_H, v: 4 + hash(i, 3) * 6, c: ".'*`"[i % 4]!,
  }));

  function picture(s: RelicShape, t: number, turn: number): string[][] {
    const rows = relicGL()?.render(s, {
      // sway from side to side so the front always shows; the pointer can turn it further
      angle: 0.34 * Math.sin(t * 0.55) + turn, w: STAGE_W, h: STAGE_H, stage: true, lift: 0.26 + 0.03 * Math.sin(t * 1.3), swing: 0.25 * Math.sin(t * 1.9),
    }) ?? blank(STAGE_W, STAGE_H);
    return rows.map((row, y) => [...row].map((ch, x) => (ch === ' ' ? beamChar(x, y, t) : ch)));
  }

  function draw(): void {
    if (!shape) return;
    const now = performance.now();
    const t = (now - start) / 1000;
    yaw += (yawTarget - yaw) * 0.12;
    const cells = picture(shape, t, yaw);
    for (const e of embers) {
      e.y -= e.v * 0.07;
      if (e.y < 0) e.y += STAGE_H * 0.8;
      const cx = Math.round(e.x + Math.sin(t * 1.1 + e.v) * 2.6), cy = e.y | 0;
      const cur = cells[cy]?.[cx];
      if (cur === ' ' || cur === '.' || cur === ':') cells[cy]![cx] = e.c;
    }
    let rows = cells.map(r => r.join(''));
    if (phase === 'out') {
      const k = (now - phaseAt) / 380;
      rows = assemble(rows, 1 - k, Math.random);
      if (k >= 1) { shape = next ?? shape; next = null; phase = 'in'; phaseAt = now; }
    } else if (phase === 'in') {
      const k = (now - phaseAt) / 1000;
      rows = assemble(rows, k, Math.random);
      if (k >= 1) phase = 'idle';
    }
    pre.textContent = rows.join('\n');
  }

  if (!reduce) {
    window.setInterval(() => { if (isActive() && !document.hidden) draw(); }, 50);
    pre.addEventListener('pointermove', e => {
      const r = pre.getBoundingClientRect();
      yawTarget = ((e.clientX - r.left) / r.width - 0.5) * 5;
    });
    pre.addEventListener('pointerleave', () => { yawTarget = 0; });
  }

  return {
    show(s) {
      if (reduce) { shape = s; pre.textContent = picture(s, 0, 0).map(r => r.join('')).join('\n'); return; }
      const now = performance.now();
      if (!shape) { shape = s; phase = 'in'; phaseAt = now; return; }
      if (s === shape && !next) return;
      next = s;
      if (phase !== 'out') { phase = 'out'; phaseAt = now; }
    },
  };
}
