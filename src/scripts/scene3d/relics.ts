import * as THREE from 'three';

/**
 * The relics as real 3D objects. Each stands for something about its project:
 * cauldron (meals), tome (lessons), owl (a teacher), mask (a face), bell (a call).
 * Every object fits inside a sphere of radius about 1, y up, facing +z.
 */
export const SHAPES = ['cauldron', 'tome', 'owl', 'mask', 'bell'] as const;
export type RelicShape = (typeof SHAPES)[number];

const lathe = (profile: [number, number][], mat: THREE.Material, seg = 40) =>
  new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);

/** Build one relic. For the bell, `userData.swing` is the part that rocks from its yoke. */
export function buildRelic(shape: RelicShape): THREE.Group {
  const stone = new THREE.MeshPhongMaterial({ color: 0x6e6e6e, shininess: 40, specular: 0x777777, side: THREE.DoubleSide });
  const dark = new THREE.MeshPhongMaterial({ color: 0x363636, shininess: 10, specular: 0x222222 });
  const pale = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 8, specular: 0x222222 });
  const hollow = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const g = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, parent: THREE.Object3D = g): T => {
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material = stone) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const ball = (r: number, mat: THREE.Material = stone) => new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat);
  const cyl = (rTop: number, rBot: number, h: number, mat: THREE.Material = stone, seg = 20) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  const ring = (R: number, r: number, mat: THREE.Material = stone, arc = Math.PI * 2) =>
    new THREE.Mesh(new THREE.TorusGeometry(R, r, 10, 36, arc), mat);

  if (shape === 'cauldron') {
    // a round-bellied pot with a thick rim, seen slightly from above so the stew shows
    add(lathe([
      [0, -0.5], [0.4, -0.5], [0.66, -0.34], [0.8, -0.02], [0.78, 0.26], [0.64, 0.46], [0.7, 0.56], [0.77, 0.6],
      [0.77, 0.67], [0.63, 0.62], [0.58, 0.5], [0.7, 0.26], [0.7, 0], [0.56, -0.26], [0.3, -0.4], [0, -0.42],
    ], stone));
    const stew = add(new THREE.Mesh(new THREE.CircleGeometry(0.6, 36), dark), 0, 0.45, 0);
    stew.rotation.x = -Math.PI / 2;
    for (const [bx, bz, r] of [[0.2, 0.1, 0.09], [-0.25, -0.1, 0.07], [0.02, -0.3, 0.06], [-0.1, 0.28, 0.08], [0.36, -0.2, 0.05]] as const) {
      add(ball(r, pale), bx, 0.46, bz);
    }
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3 + 0.5;
      add(cyl(0.1, 0.05, 0.36), Math.cos(a) * 0.46, -0.66, Math.sin(a) * 0.46);
    }
    for (const sx of [-1, 1]) {
      add(box(0.1, 0.12, 0.16), sx * 0.8, 0.34, 0);
      add(ring(0.15, 0.04), sx * 0.9, 0.2, 0);
    }
  } else if (shape === 'tome') {
    // a thick clasped book standing upright, turned a little so the page edges show
    const book = add(new THREE.Group());
    book.rotation.y = -0.28;
    add(box(0.84, 1.24, 0.22, pale), 0.03, 0, 0, book);
    for (const sz of [-1, 1]) add(box(0.96, 1.36, 0.05), 0, 0, sz * 0.135, book);
    add(cyl(0.16, 0.16, 1.36), -0.48, 0, 0, book);
    for (const y of [-0.46, -0.16, 0.16, 0.46]) add(cyl(0.185, 0.185, 0.07, dark), -0.48, y, 0, book);
    // a raised border and a diamond boss on the cover
    for (const [w, h, x, y] of [[0.7, 0.05, 0.05, 0.52], [0.7, 0.05, 0.05, -0.52], [0.05, 1.04, 0.4, 0], [0.05, 1.04, -0.3, 0]] as const) {
      add(box(w, h, 0.05), x, y, 0.17, book);
    }
    const boss = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.2), stone), 0.05, 0, 0.17, book);
    boss.scale.z = 0.35;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(ball(0.055), 0.05 + sx * 0.33, sy * 0.5, 0.18, book);
    add(box(0.14, 0.18, 0.36, dark), 0.5, 0, 0, book);
  } else if (shape === 'owl') {
    // an owl on a branch: round body, round head, ear tufts, wide ringed eyes
    const body = add(ball(1), 0, -0.14, 0);
    body.scale.set(0.5, 0.66, 0.44);
    add(ball(0.46), 0, 0.48, 0.02);
    for (const sx of [-1, 1]) {
      const tuft = add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 14), stone), sx * 0.3, 0.94, 0);
      tuft.rotation.z = -sx * 0.4;
      add(ring(0.185, 0.045, pale), sx * 0.2, 0.52, 0.41);
      const socket = add(new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), hollow), sx * 0.2, 0.52, 0.425);
      socket.rotation.y = sx * 0.2;
      add(ball(0.055, pale), sx * 0.2, 0.52, 0.46);
      const wing = add(ball(1, dark), sx * 0.48, -0.16, -0.02);
      wing.scale.set(0.13, 0.5, 0.34);
      wing.rotation.z = sx * 0.14;
      for (const dx of [-0.05, 0.05]) add(cyl(0.03, 0.02, 0.14, dark, 8), sx * 0.17 + dx, -0.8, 0.18);
    }
    const beak = add(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 10), pale), 0, 0.36, 0.48);
    beak.rotation.x = 2.5;
    // breast feathers as a few raised rows
    for (let r = 0; r < 3; r++) for (let k = -1; k <= 1; k++) add(ball(0.07), k * 0.15 + (r % 2 ? 0.075 : 0), -0.02 - r * 0.17, 0.4 - r * 0.02);
    const branch = add(cyl(0.07, 0.08, 1.7, dark, 12), 0, -0.88, 0.14);
    branch.rotation.z = Math.PI / 2 + 0.06;
  } else if (shape === 'mask') {
    // a face: brow, hollow eyes, a nose ridge and a mouth, with ribbons at the temples
    const face = add(ball(1), 0, 0.02, -0.05);
    face.scale.set(0.6, 0.8, 0.36);
    const onFace = (x: number, y: number) => 0.36 * Math.sqrt(Math.max(0, 1 - (x / 0.6) ** 2 - ((y - 0.02) / 0.8) ** 2)) - 0.05;
    for (const sx of [-1, 1]) {
      const eye = add(new THREE.Mesh(new THREE.CircleGeometry(1, 28), hollow), sx * 0.24, 0.16, onFace(0.24, 0.16) + 0.012);
      eye.scale.set(0.2, 0.125, 1);
      eye.rotation.y = sx * 0.42;
      eye.rotation.z = -sx * 0.14;
      const brow = add(ring(0.21, 0.04, pale, Math.PI * 0.8), sx * 0.24, 0.13, onFace(0.24, 0.3) + 0.01);
      brow.rotation.z = Math.PI * 0.1;
      brow.rotation.y = sx * 0.4;
      const ribbon = add(box(0.07, 0.9, 0.02, dark), sx * 0.66, -0.3, -0.16);
      ribbon.rotation.z = sx * 0.2;
      add(ball(0.06, dark), sx * 0.6, 0.12, -0.08);
    }
    const nose = add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.46, 4), pale), 0, -0.06, onFace(0, -0.06) + 0.03);
    nose.rotation.y = Math.PI / 4;
    const mouth = add(new THREE.Mesh(new THREE.CircleGeometry(1, 24), hollow), 0, -0.44, onFace(0, -0.44) + 0.012);
    mouth.scale.set(0.22, 0.055, 1);
    const jewel = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.09), pale), 0, 0.52, onFace(0, 0.52) + 0.03);
    jewel.scale.z = 0.5;
  } else {
    // a bell hung from a beam; the bell itself rocks from the beam
    add(box(1.5, 0.12, 0.16, dark), 0, 0.9, 0);
    for (const sx of [-1, 1]) add(box(0.1, 0.3, 0.16, dark), sx * 0.7, 0.78, 0);
    const swing = add(new THREE.Group(), 0, 0.84, 0);
    const hang = (o: THREE.Object3D, y: number) => add(o, 0, y - 0.84, 0, swing);
    hang(lathe([
      [0, 0.62], [0.14, 0.62], [0.25, 0.52], [0.31, 0.3], [0.37, -0.05], [0.5, -0.38], [0.68, -0.55], [0.74, -0.6],
      [0.72, -0.66], [0.6, -0.6], [0.44, -0.4], [0.3, -0.08], [0.22, 0.3], [0, 0.44],
    ], stone), 0);
    hang(ring(0.11, 0.04), 0.72);
    hang(cyl(0.025, 0.025, 0.6, dark, 8), -0.36);
    hang(ball(0.11, dark), -0.68);
    for (const y of [0.3, -0.34]) {
      const band = hang(ring(y > 0 ? 0.315 : 0.5, 0.02), y);
      band.rotation.x = Math.PI / 2;
    }
    g.userData.swing = swing;
  }
  return g;
}

/** A two-tier stone plinth for the stage, with a soft dark patch where the relic's shadow falls. */
export function buildPlinth(): THREE.Group {
  const mat = new THREE.MeshPhongMaterial({ color: 0x6a6a6a, shininess: 6, specular: 0x1a1a1a });
  const g = new THREE.Group();
  const tier = (rTop: number, rBot: number, h: number, y: number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 44), mat);
    m.position.y = y;
    g.add(m);
  };
  tier(0.6, 0.64, 0.14, -1.1);
  tier(0.44, 0.48, 0.13, -0.965);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.898;
  g.add(shadow);
  return g;
}
