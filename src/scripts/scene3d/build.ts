import * as THREE from 'three';
import { APSE_Z, CROSSING_Z } from './path';

/**
 * The whole world as real geometry: a gothic cathedral with a nave you can walk down,
 * standing in a graveyard under a moon. Gothic architecture only: it carries no religious
 * symbols (no crosses anywhere, including window tracery and grave markers).
 *
 * Units are metres. The facade faces +z; the nave runs toward -z; y is up.
 */
export interface Cathedral {
  scene: THREE.Scene;
  moon: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  /** Exterior windows, lit one by one during the entrance. `h` is height, 0 ground to 1 spire tip. */
  windows: { mat: THREE.MeshBasicMaterial; h: number; max: number }[];
  rose: THREE.MeshBasicMaterial;
  /** Flames: a halo to flicker and, for some, a light. */
  flames: { halo: THREE.Sprite; light: THREE.PointLight | null; base: number; phase: number }[];
  clouds: THREE.Mesh[];
}

/** Layer for lights and sky; solid stone stays on layer 0. */
export const DECO_LAYER = 1;

const BAY = 7;
const BAYS = 13;
const NAVE = BAY * BAYS; // 91 m
const SPIRE_TOP = 72;

function rng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const grey = (v: number) => new THREE.Color(v, v, v);

/** Trace a pointed arch, open at the bottom, from its left foot over the apex to its right foot. */
function traceArch(p: THREE.Path, cx: number, y0: number, w: number, h: number, first: boolean): void {
  const l = cx - w / 2, r = cx + w / 2, shoulder = y0 + h * 0.5;
  if (first) p.moveTo(l, y0); else p.lineTo(l, y0);
  p.lineTo(l, shoulder);
  p.quadraticCurveTo(l, y0 + h * 0.86, cx, y0 + h);
  p.quadraticCurveTo(r, y0 + h * 0.86, r, shoulder);
  p.lineTo(r, y0);
}

function archHole(cx: number, y0: number, w: number, h: number): THREE.Path {
  const p = new THREE.Path();
  traceArch(p, cx, y0, w, h, true);
  p.closePath();
  return p;
}

function circleHole(cx: number, cy: number, r: number): THREE.Path {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return p;
}

/** Points along a pointed arch spanning `span`, springing at `spring` and peaking at `apex`. */
function archPoints(span: number, spring: number, apex: number, n = 10): [number, number][] {
  const pts: [number, number][] = [];
  const h = span / 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([-h * u * u - h * 0.96 * 2 * u * t, spring * u * u + (spring + (apex - spring) * 0.8) * 2 * u * t + apex * t * t]);
  }
  for (let i = n - 1; i >= 0; i--) pts.push([-pts[i]![0], pts[i]![1]]);
  return pts;
}

export function buildCathedral(): Cathedral {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const fog = new THREE.FogExp2(0x000000, 0.0028);
  scene.fog = fog;

  const wall = new THREE.MeshLambertMaterial({ color: 0x8c8c8c });
  const dark = new THREE.MeshLambertMaterial({ color: 0x626262 });
  const roof = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
  const earth = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const windows: Cathedral['windows'] = [];
  const flames: Cathedral['flames'] = [];

  /** Mark something as light or sky rather than solid stone, so it is left out of the outline pass. */
  const deco = <T extends THREE.Object3D>(o: T): T => { o.layers.set(DECO_LAYER); return o; };

  // ---------- small builders ----------
  const add = <T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x = 0, y = 0, z = 0): T => {
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material = wall) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const cyl = (rTop: number, rBot: number, h: number, mat: THREE.Material = wall, seg = 12) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  /** A four-sided spire with its base square to the axes. */
  const pyramid = (base: number, h: number, mat: THREE.Material = roof) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(base / Math.SQRT2, h, 4), mat);
    m.rotation.y = Math.PI / 4;
    return m;
  };
  const ball = (r: number, mat: THREE.Material = wall) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
  const extrude = (shape: THREE.Shape, depth: number, mat: THREE.Material = wall) =>
    new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), mat);
  /** A glowing pane. `ignites` registers it to light up during the entrance. */
  const glass = (w: number, h: number, v: number, ignites?: number) => {
    const mat = new THREE.MeshBasicMaterial({ color: grey(ignites === undefined ? v : 0.04), side: THREE.DoubleSide });
    if (ignites !== undefined) windows.push({ mat, h: ignites / SPIRE_TOP, max: v });
    return deco(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat));
  };
  /** A tube following an arch drawn in the XY plane. */
  const archTube = (pts: [number, number][], radius: number, mat: THREE.Material = wall) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 28, radius, 6), mat);
  };
  /** Wheel tracery in the XY plane. Ten spokes, none upright or level, so it never reads as a cross. */
  const tracery = (R: number) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.07, 6, 40), wall));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.52, R * 0.04, 6, 30), wall));
    for (let k = 0; k < 10; k++) {
      const spoke = box(R * 0.92, R * 0.045, R * 0.05);
      const a = (k * Math.PI) / 5 + 0.157;
      spoke.position.set(Math.cos(a) * R * 0.54, Math.sin(a) * R * 0.54, 0);
      spoke.rotation.z = a;
      g.add(spoke);
    }
    g.add(ball(R * 0.12));
    return g;
  };

  // soft round glow for flames
  const haloTex = (() => {
    const n = 32, data = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - (n - 1) / 2, y - (n - 1) / 2) / (n / 2);
      const a = Math.max(0, 1 - d);
      const i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(255 * a * a);
    }
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  })();
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  /** A flame at (x, y, z): a bright core, a halo, and optionally a light of the given strength. */
  const flame = (x: number, y: number, z: number, size: number, light = 0) => {
    add(scene, deco(ball(size * 0.11, flameMat)), x, y, z);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
    }));
    halo.scale.setScalar(size * 2.2);
    deco(halo);
    add(scene, halo, x, y, z);
    let lamp: THREE.PointLight | null = null;
    if (light > 0) {
      lamp = new THREE.PointLight(0xffffff, light, 24, 2);
      add(scene, lamp, x * 0.8, y + 0.4, z);
    }
    flames.push({ halo, light: lamp, base: light, phase: x * 1.7 + z * 0.9 });
  };

  // ---------- grounds ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), earth);
  ground.rotation.x = -Math.PI / 2;
  add(scene, ground, 0, 0, -100);

  const rnd = rng(7);
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (24 + rnd() * 50), z = 6 + rnd() * 34;
    const h = 1 + rnd() * 1.3;
    if (rnd() < 0.35) {
      // plain obelisk
      add(scene, box(0.7, h * 1.6, 0.7, dark), x, h * 0.8, z);
      add(scene, pyramid(0.7, 0.8, dark), x, h * 1.6 + 0.4, z);
    } else {
      const stone = add(scene, box(1, h, 0.28, dark), x, h / 2, z);
      stone.rotation.z = (rnd() - 0.5) * 0.16;
      const cap = add(scene, cyl(0.5, 0.5, 0.28, dark, 14), x, h, z);
      cap.rotation.x = Math.PI / 2;
    }
  }

  /** A bare tree: a trunk that forks. */
  const limb = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, rand: () => number) => {
    const to = from.clone().addScaledVector(dir, len);
    const m = cyl(r * 0.7, r, len, dark, 6);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    scene.add(m);
    if (depth <= 0) return;
    for (let k = 0; k < 2 + (rand() > 0.6 ? 1 : 0); k++) {
      const d = dir.clone().add(new THREE.Vector3(rand() - 0.5, rand() * 0.5, rand() - 0.5).multiplyScalar(1.1)).normalize();
      limb(to, d, len * 0.68, r * 0.62, depth - 1, rand);
    }
  };
  const treeRnd = rng(31);
  for (const [x, z] of [[34, 16], [-38, 22], [56, 30], [-60, 12]] as const) {
    limb(new THREE.Vector3(x, 0, z), new THREE.Vector3(0, 1, 0), 5, 0.4, 3, treeRnd);
  }

  // iron fence in the foreground, with a gap before the door
  for (let x = -76; x <= 76; x += 2) {
    if (Math.abs(x) < 6) continue;
    add(scene, box(0.16, 1.9, 0.16, dark), x, 0.95, 44);
    add(scene, pyramid(0.34, 0.5, dark), x, 2.15, 44);
  }
  for (const sgn of [-1, 1]) {
    add(scene, box(71, 0.12, 0.12, dark), sgn * 41.5, 1.5, 44);
    add(scene, box(71, 0.12, 0.12, dark), sgn * 41.5, 0.5, 44);
  }

  // porch slabs
  add(scene, box(22, 0.2, 9), 0, 0.1, 6.5);
  add(scene, box(16, 0.2, 6), 0, 0.3, 5);

  // ---------- sky ----------
  const moonMat = new THREE.MeshBasicMaterial({ color: grey(0.36), fog: false });
  add(scene, deco(new THREE.Mesh(new THREE.CircleGeometry(46, 48), moonMat)), -230, 200, -420);
  const crater = new THREE.MeshBasicMaterial({ color: grey(0.24), fog: false });
  for (const [dx, dy, r] of [[-14, 12, 8], [10, -8, 11], [-20, -14, 5], [14, 20, 4], [-2, -26, 4]] as const) {
    add(scene, deco(new THREE.Mesh(new THREE.CircleGeometry(r, 20), crater)), -230 + dx, 200 + dy, -419);
  }
  const clouds: THREE.Mesh[] = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.62, fog: false, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const c = deco(new THREE.Mesh(new THREE.CircleGeometry(1, 24), cloudMat));
    c.scale.set(50 + rnd() * 40, 7 + rnd() * 6, 1);
    c.userData.speed = 2 + rnd() * 3;
    c.userData.offset = rnd() * 700;
    add(scene, c, 0, 160 + rnd() * 80, -410);
    clouds.push(c);
  }
  {
    const n = 520, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, e = 0.06 + rnd() * 1.2, r = 700;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r - 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(deco(new THREE.Points(geo, new THREE.PointsMaterial({ color: grey(0.5), size: 1, sizeAttenuation: false, fog: false }))));
  }

  // the city behind
  for (let i = 0; i < 70; i++) {
    const w = 10 + rnd() * 14, h = 16 + rnd() * 44, x = -330 + i * 9.6 + rnd() * 6, z = -190 - rnd() * 90;
    if (Math.abs(x) < 34 && h < 60) continue;
    const spired = rnd() < 0.4, top = spired ? 14 + rnd() * 26 : 5;
    add(scene, deco(box(w, h, w, wall)), x, h / 2, z);
    add(scene, deco(pyramid(w * 1.05, top, wall)), x, h + top / 2, z);
    if (rnd() < 0.4) add(scene, glass(1.2, 1.8, 0.3), x + (rnd() - 0.5) * w * 0.5, h * (0.4 + rnd() * 0.4), z + w / 2 + 0.1);
  }

  // ---------- the half that is mirrored (x > 0) ----------
  const half = new THREE.Group();

  // tower front, with a recessed door and windows
  {
    const s = new THREE.Shape();
    s.moveTo(8, 0);
    traceArch(s, 14, 0, 3.5, 7, false);
    s.lineTo(20, 0); s.lineTo(20, 42); s.lineTo(8, 42); s.closePath();
    for (const cx of [11.5, 16.5]) {
      s.holes.push(archHole(cx, 12, 2, 9));
      s.holes.push(archHole(cx, 26, 2, 8.5));
    }
    s.holes.push(circleHole(14, 23.4, 1.3));
    add(half, extrude(s, 1.2));
  }
  add(half, box(12, 42, 12), 14, 21, -6);
  add(half, box(3.4, 7, 0.1, black), 14, 3.5, 0.06);
  add(half, glass(9, 9.6, 0.62, 16.6), 14, 16.6, 0.3);
  add(half, glass(9, 9, 0.62, 30), 14, 30.2, 0.3);
  add(half, glass(3, 3, 0.5, 23.4), 14, 23.4, 0.3);
  // spire, pinnacles and a plain ball finial
  add(half, pyramid(12.6, 30), 14, 57, -6);
  add(half, ball(0.55), 14, 72.4, -6);
  for (const [px, pz] of [[8.8, 0.4], [19.2, 0.4], [8.8, -11.2], [19.2, -11.2]] as const) {
    add(half, box(1.5, 3, 1.5), px, 43.5, pz);
    add(half, pyramid(1.7, 6.5), px, 48.2, pz);
  }
  // buttresses and string courses give the front its relief
  for (const bx of [8, 20]) {
    add(half, box(1.5, 34, 2.4), bx, 17, 2.2);
    add(half, box(1.5, 6, 1.6), bx, 37, 1.8);
    add(half, pyramid(1.7, 3, wall), bx, 41.5, 1.8);
  }
  for (const y of [11, 22, 36]) add(half, box(12.6, 0.5, 0.6), 14, y, 1.5);

  // side chapel beyond the tower
  add(half, box(9, 16, 12), 24.5, 8, -7);
  add(half, pyramid(9.4, 5), 24.5, 18.5, -7);
  for (const wx of [22.6, 26.4]) add(half, glass(1.5, 7, 0.5, 9), wx, 8.5, -0.94);
  add(half, box(1.3, 20, 2.2), 29.4, 10, -1.4);
  add(half, pyramid(1.5, 4, wall), 29.4, 22, -1.4);

  // nave arcade: one long wall pierced by an arch per bay, with a small window above each
  {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    for (let i = 0; i < BAYS; i++) traceArch(s, i * BAY + BAY / 2, 0, 5.4, 12, false);
    s.lineTo(NAVE, 0); s.lineTo(NAVE, 18); s.lineTo(0, 18); s.closePath();
    for (let i = 0; i < BAYS; i++) s.holes.push(archHole(i * BAY + BAY / 2, 13.3, 1.6, 3.9));
    const m = add(half, extrude(s, 1), 6, 0, 0);
    m.rotation.y = Math.PI / 2;
  }
  const clerestory = add(half, glass(NAVE, 4.6, 0.2), 7.12, 15.4, -NAVE / 2);
  clerestory.rotation.y = -Math.PI / 2;
  for (let i = 0; i <= BAYS; i++) {
    add(half, cyl(0.8, 0.9, 7.2), 6, 3.6, -i * BAY);
    add(half, box(2.3, 0.5, 2.3), 6, 7.4, -i * BAY);
    add(half, cyl(0.26, 0.26, 10.6), 5.7, 12.9, -i * BAY);
  }
  // side aisle
  add(half, box(1, 12, NAVE), 12.5, 6, -NAVE / 2);
  add(half, box(6, 0.5, NAVE, dark), 9, 12.25, -NAVE / 2);
  for (let i = 0; i < BAYS; i++) {
    const pane = add(half, glass(1.8, 5.4, 0.28), 11.96, 7.4, -i * BAY - BAY / 2);
    pane.rotation.y = -Math.PI / 2;
  }

  // transept arm, ending in a wheel window
  {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(12, 0); s.lineTo(12, 20); s.lineTo(0, 20); s.closePath();
    s.holes.push(circleHole(6, 12, 3.5));
    const m = add(half, extrude(s, 1), 26, 0, -NAVE);
    m.rotation.y = Math.PI / 2;
    const pane = add(half, deco(new THREE.Mesh(new THREE.CircleGeometry(3.5, 32), new THREE.MeshBasicMaterial({ color: grey(0.8), side: THREE.DoubleSide }))), 26.5, 12, CROSSING_Z);
    pane.rotation.y = -Math.PI / 2;
    const wheel = add(half, tracery(3.5), 25.9, 12, CROSSING_Z);
    wheel.rotation.y = Math.PI / 2;
  }
  add(half, box(14, 20, 1), 19, 10, -NAVE + 0.5);
  add(half, box(14, 20, 1), 19, 10, -NAVE - 12.5);
  add(half, box(20, 0.6, 12, dark), 16, 20.3, CROSSING_Z);
  add(half, box(1, 4.5, 12), 6.5, 22.25, CROSSING_Z);
  add(half, cyl(1.3, 1.4, 18), 6, 9, -NAVE);
  add(half, cyl(1.3, 1.4, 18), 6, 9, -NAVE - 12);
  // apse side wall
  add(half, box(1, 24.5, 12), 6.5, 12.25, -NAVE - 18);

  scene.add(half);
  const mirror = half.clone(true);
  mirror.scale.x = -1;
  scene.add(mirror);

  // ---------- the centre ----------
  // west front: gable, great door, rose window and a gallery of small arches
  {
    const s = new THREE.Shape();
    s.moveTo(-8, 0);
    traceArch(s, 0, 0, 6, 12, false);
    s.lineTo(8, 0); s.lineTo(8, 30); s.lineTo(0, 42); s.lineTo(-8, 30); s.closePath();
    s.holes.push(circleHole(0, 24, 5));
    for (let i = 0; i < 7; i++) s.holes.push(archHole(-6 + i * 2, 15, 1, 2.7));
    add(scene, extrude(s, 1.5));
  }
  const rose = new THREE.MeshBasicMaterial({ color: grey(0.1), side: THREE.DoubleSide });
  add(scene, deco(new THREE.Mesh(new THREE.CircleGeometry(5, 40), rose)), 0, 24, 0.6);
  add(scene, tracery(5), 0, 24, 1.4);
  add(scene, glass(14, 3.2, 0.5, 16.4), 0, 16.4, 0.5);
  add(scene, ball(0.6), 0, 42.5, 0.75);
  for (const [w, h, r] of [[7.6, 13.2, 0.32], [9.4, 14.6, 0.28]] as const) {
    add(scene, archTube(archPoints(w, 0, h).map(([x, y]) => [x, Math.max(y, 0)] as [number, number]), r), 0, 0, 1.7);
  }
  for (const y of [13.6, 18.6, 30]) add(scene, box(16, 0.45, 0.5), 0, y, 1.65);

  // roof and a slender spire over the crossing
  {
    const s = new THREE.Shape();
    s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(0, 9); s.closePath();
    add(scene, extrude(s, 116, roof), 0, 26, -116);
  }
  add(scene, pyramid(3.4, 26), 0, 48, CROSSING_Z);
  add(scene, ball(0.4), 0, 61.3, CROSSING_Z);

  // vault and ribs
  const inner = archPoints(12, 18, 24.5);
  {
    const s = new THREE.Shape();
    s.moveTo(inner[0]![0], inner[0]![1]);
    for (const [x, y] of inner.slice(1)) s.lineTo(x, y);
    for (const [x, y] of [...inner].reverse()) s.lineTo(x * 1.08, y + 0.7);
    s.closePath();
    add(scene, extrude(s, NAVE, dark), 0, 0, -NAVE);
  }
  for (let i = 0; i <= BAYS; i++) add(scene, archTube(inner.map(([x, y]) => [x * 0.985, y - 0.22] as [number, number]), 0.3), 0, 0, -i * BAY);
  add(scene, box(12, 0.6, 12, dark), 0, 24.8, CROSSING_Z);
  add(scene, box(12, 0.6, 12, dark), 0, 24.8, -NAVE - 18);

  // tiled floor
  const tiles = (() => {
    const data = new Uint8Array([150, 150, 150, 255, 84, 84, 84, 255, 84, 84, 84, 255, 150, 150, 150, 255]);
    const t = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  })();
  const floor = (w: number, d: number, x: number, z: number, y: number) => {
    const map = tiles.clone();
    map.repeat.set(w / 4, d / 4);
    map.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map }));
    m.rotation.x = -Math.PI / 2;
    add(scene, m, x, y, z);
  };
  floor(26, 116, 0, -58, 0.03);
  floor(56, 12, 0, CROSSING_Z, 0.04);

  // far wall and the great window: three tall lights
  {
    const s = new THREE.Shape();
    s.moveTo(-6, 0); s.lineTo(6, 0); s.lineTo(6, 24.5); s.lineTo(-6, 24.5); s.closePath();
    s.holes.push(archHole(-3.5, 4, 2, 13));
    s.holes.push(archHole(0, 4, 2.6, 17.5));
    s.holes.push(archHole(3.5, 4, 2, 13));
    add(scene, extrude(s, 1), 0, 0, APSE_Z - 1);
  }
  add(scene, glass(11, 18.5, 1), 0, 12.8, APSE_Z - 0.7);

  // a fire bowl before the great window
  add(scene, box(1.7, 1.2, 1.7), 0, 0.6, -109);
  add(scene, cyl(0.95, 0.5, 0.55, dark, 14), 0, 1.5, -109);
  flame(0, 2.1, -109, 3.2, 150);

  // candles down the nave, a light at every other one
  for (let i = 1; i <= BAYS; i++) {
    for (const sgn of [-1, 1]) {
      const lit = (i % 4 === 1 && sgn === 1) || (i % 4 === 3 && sgn === -1);
      flame(sgn * 5.05, 3.3, -i * BAY, 1, lit ? 60 : 0);
    }
  }
  // candelabra at the crossing
  for (const [x, z, light] of [[3.6, -101.5, 50], [-3.6, -101.5, 0], [3.6, -92.5, 0], [-3.6, -92.5, 50]] as const) {
    add(scene, cyl(0.07, 0.1, 2.7, dark, 6), x, 1.35, z);
    add(scene, box(1.1, 0.07, 0.07, dark), x, 2.55, z);
    for (const dx of [-0.5, 0, 0.5]) flame(x + dx, dx === 0 ? 2.95 : 2.75, z, 0.9, dx === 0 ? light : 0);
  }

  // ---------- light ----------
  const moon = new THREE.DirectionalLight(0xffffff, 2.6);
  moon.position.set(-0.55, 0.85, 0.75);
  scene.add(moon);
  const ambient = new THREE.HemisphereLight(grey(1), grey(0.25), 0.55);
  scene.add(ambient);

  return { scene, moon, ambient, fog, windows, rose, flames, clouds };
}
