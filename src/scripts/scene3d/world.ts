import * as THREE from 'three';
import { lerp, smooth } from '../math';
import { DECO_LAYER, buildCathedral } from './build';
import { drawHalf, pairTarget, sharedRenderer, splitPair } from './gl';
import type { Pose } from './path';

export interface WorldState {
  pose: Pose;
  /** Seconds, for anything that moves on its own (flames, clouds). */
  time: number;
  /** Entrance clock in seconds; windows light as it advances. */
  t: number;
  /** 0 outside, 1 inside the building: dims the moonlight and thickens the air. */
  inside: number;
  /** Pointer position, -1..1 on each axis; shifts the camera slightly for depth. */
  mx: number;
  my: number;
  roseLit: number;
}

/** One frame, at one pixel per character cell. Rows are bottom-up, four bytes per pixel. */
export interface WorldFrame {
  /** The lit view; brightness is in the red channel. */
  lit: Uint8Array;
  /** Which way each surface faces, as colour. Sharp changes between neighbours mark outlines. */
  facing: Uint8Array;
}

export interface World {
  resize(cols: number, rows: number, aspect: number): void;
  /**
   * Draw a frame and return the most recent one that has come back from the graphics card
   * (null until the first arrives). Read-back does not block: if the previous frame is still
   * on its way, this call draws nothing and returns the last picture.
   */
  render(s: WorldState): WorldFrame | null;
}

/** The 3D cathedral and a renderer that draws it very small, for conversion to characters. Null without WebGL. */
export function createWorld(): World | null {
  const renderer = sharedRenderer();
  if (!renderer) return null;

  const c = buildCathedral();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.3, 1200);
  const facingMat = new THREE.MeshNormalMaterial();
  const look = new THREE.Vector3();

  let cols = 2, rows = 2;
  let target = pairTarget(cols, rows);
  let raw = new Uint8Array(cols * 2 * rows * 4);
  let lit = new Uint8Array(cols * rows * 4);
  let facing = new Uint8Array(cols * rows * 4);
  let have = false;
  let busy = false;
  let generation = 0;

  return {
    resize(newCols, newRows, aspect) {
      generation++;
      busy = false;
      have = false;
      cols = newCols;
      rows = newRows;
      target.dispose();
      target = pairTarget(cols, rows);
      raw = new Uint8Array(cols * 2 * rows * 4);
      lit = new Uint8Array(cols * rows * 4);
      facing = new Uint8Array(cols * rows * 4);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    render(s) {
      if (busy) return have ? { lit, facing } : null;

      const sway = 1 - s.inside * 0.5;
      camera.position.set(s.pose.pos[0] + s.mx * 1.3 * sway, s.pose.pos[1] - s.my * 0.6 * sway, s.pose.pos[2]);
      look.set(s.pose.look[0], s.pose.look[1], s.pose.look[2]);
      camera.lookAt(look);

      // moonlight belongs outside; indoors the flames do the work and the air is thick
      c.moon.intensity = lerp(2.1, 0.03, s.inside);
      c.ambient.intensity = lerp(0.3, 0.05, s.inside);
      c.fog.density = lerp(0.0028, 0.021, s.inside);

      // windows light from the top down as the entrance carves the building, the rose last
      for (const w of c.windows) {
        const start = lerp(5.6, 1.6, w.h);
        w.mat.color.setScalar(lerp(0.04, w.max, smooth((s.t - start) / 0.7)));
      }
      const flick = 0.9 + 0.1 * Math.sin(s.time * 7.3) * Math.sin(s.time * 2.9 + 1.3);
      c.rose.color.setScalar(lerp(0.1, 1, s.roseLit) * flick);

      for (const f of c.flames) {
        const k = 0.78 + 0.22 * Math.sin(s.time * 9 + f.phase) * Math.sin(s.time * 3.1 + f.phase * 0.7);
        (f.halo.material as THREE.SpriteMaterial).opacity = 0.55 * k;
        if (f.light) f.light.intensity = f.base * k;
      }
      for (const cloud of c.clouds) {
        cloud.position.x = ((cloud.userData.offset + s.time * cloud.userData.speed) % 700) - 480;
      }

      // left half: the lit view, stone and lights together
      camera.layers.enableAll();
      drawHalf(renderer, target, 0, c.scene, camera);
      // right half: solid stone only, coloured by the way each surface faces
      camera.layers.set(0);
      camera.layers.disable(DECO_LAYER);
      c.scene.overrideMaterial = facingMat;
      drawHalf(renderer, target, 1, c.scene, camera);
      c.scene.overrideMaterial = null;

      // fetch both halves in one read that does not stall the page
      const gen = generation, w = cols, h = rows, buf = raw;
      busy = true;
      const done = () => {
        if (gen !== generation) return;
        splitPair(buf, w, h, lit, facing);
        have = true;
        busy = false;
      };
      try {
        renderer.readRenderTargetPixelsAsync(target, 0, 0, w * 2, h, buf).then(done, () => { if (gen === generation) busy = false; });
      } catch {
        renderer.readRenderTargetPixels(target, 0, 0, w * 2, h, buf);
        done();
      }
      renderer.setRenderTarget(null);
      return have ? { lit, facing } : null;
    },
  };
}
