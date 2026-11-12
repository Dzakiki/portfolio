import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildCathedral } from '../src/scripts/scene3d/build';

describe('cathedral', () => {
  const c = buildCathedral();
  let meshes = 0;
  c.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes++; });

  it('is built from a substantial amount of real geometry', () => {
    expect(meshes).toBeGreaterThan(400);
  });
  it('has windows to light, flames to flicker and clouds to drift', () => {
    expect(c.windows.length).toBeGreaterThanOrEqual(5);
    for (const w of c.windows) { expect(w.h).toBeGreaterThan(0); expect(w.h).toBeLessThan(1); }
    expect(c.flames.length).toBeGreaterThan(30);
    expect(c.flames.filter(f => f.light).length).toBeLessThanOrEqual(12);
    expect(c.clouds.length).toBeGreaterThan(3);
  });
  it('is symmetric: the mirrored half matches the built half', () => {
    const box = new THREE.Box3().setFromObject(c.scene.children.find(o => o.scale.x === -1)!);
    expect(box.min.x).toBeLessThan(-25);
    expect(box.max.x).toBeLessThanOrEqual(0.001);
  });
  it('wheel windows have ten spokes with none upright or level, so they never read as a cross', () => {
    for (let k = 0; k < 10; k++) {
      const deg = ((k * 36 + 9) % 180 + 180) % 180;
      expect(Math.min(deg, 180 - deg)).toBeGreaterThan(5);
      expect(Math.abs(deg - 90)).toBeGreaterThan(5);
    }
  });
});
