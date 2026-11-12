import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SOLID, STAGE_H, STAGE_W, beamChar, rowsFrom } from '../src/scripts/relic3d';
import { SHAPES, buildPlinth, buildRelic } from '../src/scripts/scene3d/relics';

const meshes = (o: THREE.Object3D) => { let n = 0; o.traverse(c => { if ((c as THREE.Mesh).isMesh) n++; }); return n; };

describe('relic models', () => {
  it('builds every relic from several parts, within arm\'s reach of the centre', () => {
    for (const shape of SHAPES) {
      const relic = buildRelic(shape);
      expect(meshes(relic), shape).toBeGreaterThanOrEqual(8);
      const box = new THREE.Box3().setFromObject(relic);
      for (const v of [...box.min.toArray(), ...box.max.toArray()]) expect(Math.abs(v), shape).toBeLessThan(1.2);
      expect(box.max.y - box.min.y, shape).toBeGreaterThan(1.2);
    }
  });
  it('only the bell has a part that swings', () => {
    for (const shape of SHAPES) expect(Boolean(buildRelic(shape).userData.swing), shape).toBe(shape === 'bell');
  });
  it('the plinth sits below where the relic floats', () => {
    const box = new THREE.Box3().setFromObject(buildPlinth());
    expect(box.max.y).toBeLessThan(-0.8);
    expect(box.min.y).toBeGreaterThan(-1.3);
  });
});

describe('relic to characters', () => {
  const w = 6, h = 4;
  const px = () => new Uint8Array(w * h * 4);
  const flat = (v: number) => px().fill(v);

  it('draws nothing in empty space, and marks dark parts of the object as solid', () => {
    const empty = rowsFrom(px(), px(), w, h);
    expect(empty).toHaveLength(h);
    for (const row of empty) expect(row).toBe(' '.repeat(w));
    const hollow = rowsFrom(px(), flat(128), w, h);
    for (const row of hollow) expect(row).toBe(SOLID.repeat(w));
  });
  it('reads the picture bottom-up: the first buffer row is the last line of text', () => {
    const lit = px();
    lit[0] = 255;
    const rows = rowsFrom(lit, flat(128), w, h);
    expect(rows[h - 1]![0]).toBe('@');
    expect(rows[0]!.replaceAll(SOLID, '')).toBe('');
  });
  it('draws brighter surfaces with denser characters', () => {
    const lit = px();
    lit[0] = 60; lit[4] = 255;
    const row = rowsFrom(lit, flat(128), w, h)[h - 1]!;
    expect(' .:-=+*#%@'.indexOf(row[1]!)).toBeGreaterThan(' .:-=+*#%@'.indexOf(row[0]!));
  });
  it('draws an outline where neighbouring cells face different ways, even in the dark', () => {
    const facing = flat(128);
    for (let y = 0; y < h; y++) for (let x = 3; x < w; x++) facing[(y * w + x) * 4] = 255;
    const rows = rowsFrom(px(), facing, w, h);
    for (const row of rows) {
      expect('#%@').toContain(row[2]);
      expect(row[0]).toBe(SOLID);
      expect(row[5]).toBe(SOLID);
    }
  });
});

describe('shaft of light', () => {
  it('falls down the middle of the stage and leaves the corners dark', () => {
    let lit = 0;
    for (let t = 0; t < 4; t += 0.5) if (beamChar(STAGE_W / 2, 3, t) !== ' ') lit++;
    expect(lit).toBeGreaterThan(3);
    for (let t = 0; t < 4; t += 0.5) {
      expect(beamChar(0, 0, t)).toBe(' ');
      expect(beamChar(STAGE_W - 1, STAGE_H - 1, t)).toBe(' ');
    }
  });
  it('only ever draws faint characters', () => {
    for (let y = 0; y < STAGE_H; y++) for (let x = 0; x < STAGE_W; x++) expect(' .:').toContain(beamChar(x, y, 1));
  });
});
