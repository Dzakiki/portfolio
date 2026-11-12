import { Ash, Crows, clear, fromImage, lantern, makeFrame, nameBand, outline, reveal, scale, type Frame } from './effects';
import { FONT, makeGrid, type Grid } from './grid';
import { createScreen } from './scene3d/screen';
import { clamp, easeInOutCubic, smooth } from './math';
import { FrameSampler, nextNotch } from './perf';
import { REST, TAB_YAW, chamberPose, descentPose, entrancePose, type Pose } from './scene3d/path';
import { createWorld } from './scene3d/world';
import { DOOR_SHARE, ENTRANCE, crane, descentProgress, insideness, phases, pushIn, revealK, roseLit } from './timeline';

export interface HeroElements { canvas: HTMLCanvasElement; hero: HTMLElement; hint: HTMLElement; inv: HTMLElement }
export interface HeroHooks { onLand(natural: boolean): void; onNave(): void; onArrive(): void }
export interface HeroOptions {
  reduce: boolean;
  skip: boolean;
  frozenT: number | null;
  sOverride: number | null;
  /** The tab on show, which decides where the camera faces at the crossing. */
  tab(): string;
  /** Record how long each part of a frame takes, on window.__perf. */
  perf: boolean;
}

const AUTO_DESCENT_MS = 7000;
/** The 3D view is drawn in linear light; this lifts the mid-tones before picking characters. */
const GAMMA = 0.8;

export function startHero(el: HeroElements, hooks: HeroHooks, opts: HeroOptions): { descend(): void; skip(): void } {
  const { reduce } = opts;
  const screen = createScreen();
  const world = createWorld();
  if (!world || !screen) document.documentElement.classList.add('no3d');

  let notch = 0;
  let g: Grid;
  let f: Frame;
  let ash: Ash;
  const crows = new Crows();
  const sampler = new FrameSampler();

  let t0 = performance.now();
  let last = t0;
  let landed = false;
  let skipped = opts.skip;
  let arrived = false;
  let inNave = false;
  let chamberK = 0;
  let frameNo = 0;
  let yaw = TAB_YAW[opts.tab()] ?? 0;
  let nextCrows = Infinity;
  let mx = 0, my = 0, mxn = 0, myn = 0, hasMouse = false;
  let auto = 0;
  let bandY = 0.66;
  let bandHalf = 0.13;

  function rebuild(): void {
    const W = window.innerWidth, H = window.innerHeight;
    g = makeGrid(W, H, notch);
    screen?.resize(g);
    world?.resize(g.cols, g.rows, W / H);
    f = makeFrame(g);
    ash = new Ash(g, reduce ? 0 : Math.round((g.cols * g.rows) / 330));
    measureBand();
  }

  /** Where the name sits, as a fraction of viewport height, so the dimmed band follows the layout. */
  function measureBand(): void {
    const name = el.hero.querySelector('.name'), lastChild = el.hero.lastElementChild;
    if (!name || !lastChild || el.hero.style.transform) return;
    const top = name.getBoundingClientRect().top, bottom = lastChild.getBoundingClientRect().bottom;
    bandY = (top + bottom) / 2 / window.innerHeight;
    bandHalf = (bottom - top) / 2 / window.innerHeight + 0.06;
  }

  function land(natural: boolean): void {
    landed = true;
    el.hero.classList.add('in');
    window.setTimeout(() => el.hint.classList.add('in'), natural ? (ENTRANCE.hintAt - ENTRANCE.nameAt) * 1000 : 300);
    if (natural && !reduce) {
      crows.launch(g, 20);
      nextCrows = performance.now() / 1000 + 14;
    }
    hooks.onLand(natural);
  }

  function skip(): void {
    if (landed) return;
    skipped = true;
    t0 = performance.now() - 60_000;
  }

  function cancelAuto(): void {
    if (auto) { cancelAnimationFrame(auto); auto = 0; }
  }

  function descend(): void {
    if (auto) return;
    const from = window.scrollY, to = el.inv.offsetTop;
    if (reduce) { window.scrollTo(0, to); return; }
    const start = performance.now();
    const step = (now: number) => {
      const k = clamp((now - start) / AUTO_DESCENT_MS);
      window.scrollTo(0, from + (to - from) * easeInOutCubic(k));
      auto = k < 1 ? requestAnimationFrame(step) : 0;
    };
    auto = requestAnimationFrame(step);
  }

  function tick(now: number): void {
    requestAnimationFrame(tick);
    const dtMs = now - last;
    let dt = Math.min(0.05, dtMs / 1000 || 0.016);
    last = now;

    const time = reduce ? 0 : now / 1000;
    const t = opts.frozenT ?? (now - t0) / 1000;
    if (!landed && t >= ENTRANCE.nameAt) land(!skipped);

    const s = opts.sOverride ?? descentProgress(window.scrollY, window.innerHeight);
    const { door, nave } = phases(s);
    const atCrossing = s >= 0.999;

    // Standing still (at the crossing, or before the facade once the entrance is over) the view
    // barely changes, so draw every other frame.
    const resting = door <= 0 && landed && t > ENTRANCE.hintAt;
    if ((atCrossing && chamberK >= 1) || resting) {
      if (frameNo++ % 2) return;
      dt = Math.min(0.1, dt * 2);
    }

    const push = reduce ? 1 : pushIn(t - ENTRANCE.craneEnd);
    let pose: Pose;
    let inside: number;
    let blank = false;
    if (atCrossing) {
      // turn toward the view that belongs to the tab on show, the short way round
      const want = TAB_YAW[opts.tab()] ?? 0;
      const diff = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
      yaw = reduce ? want : yaw + diff * (1 - Math.exp(-dt * 2.6));
      pose = chamberPose(yaw + (reduce ? 0 : mxn * 0.05), reduce ? 0 : -myn * 0.03);
      inside = 1;
    } else if (reduce) {
      // reduced motion: no travel, just the facade cross-fading out
      pose = REST;
      inside = 0;
      blank = s >= DOOR_SHARE;
    } else if (door <= 0) {
      pose = entrancePose(crane(t), push);
      inside = 0;
    } else {
      pose = descentPose(door, nave, push);
      inside = insideness(door, nave);
    }

    const p0 = performance.now();
    const view = blank || !world ? null : world.render({ pose, time, t, inside, mx: reduce ? 0 : mxn, my: reduce ? 0 : myn, roseLit: roseLit(t) });
    if (view) {
      fromImage(f, view.lit, true, GAMMA);
      // outlines are bold outside, quieter indoors, and quietest behind the text at the crossing
      outline(f, view.facing, true, atCrossing ? 0.4 : 0.85 - 0.3 * inside);
    } else {
      clear(f);
    }

    const p1 = performance.now();
    let ashB = 0.4;
    if (atCrossing) {
      chamberK = Math.min(1, chamberK + dt * 1.2);
      // the building is a backdrop here, so it is held well below the brightness of the text
      scale(f, chamberK * 0.72);
      // keep the view quiet behind the tab's title
      nameBand(f, 0.8, 0.2, 0.16);
    } else {
      // arriving on foot the view is continuous; arriving by link, or with reduced motion, it fades in
      chamberK = reduce ? 0 : 1;
      if (inside < 1) lantern(f, hasMouse ? mx : g.W / 2, hasMouse ? my : g.H * 0.3, 1 - inside);
      nameBand(f, landed ? 1 - smooth(door / 0.5) : 0, bandY, bandHalf);
      if (reduce) scale(f, 1 - smooth(door));
      const k = revealK(t);
      if (k < 1) reveal(f, k * (g.rows + 14) - 7, t);
      ashB = t >= ENTRANCE.spiresEnd ? 0.75 - 0.35 * inside : 0;
      if (nave > 0 && !inNave) { inNave = true; hooks.onNave(); }
      if (door < 1) inNave = false;
      if (!reduce && door <= 0) {
        if (time > nextCrows) { crows.launch(g, 2); nextCrows = time + 12 + Math.random() * 10; }
        crows.step(dt, g);
        crows.stamp(f, time);
      }
    }

    if (!reduce) {
      ash.step(dt, time, g);
      if (ashB > 0.05) ash.stamp(f, ashB);
    }
    const p2 = performance.now();
    screen?.draw(f.B, f.over);
    if (opts.perf) {
      const w = window as unknown as { __perf?: Record<string, number> };
      const m = (w.__perf ??= { frames: 0, world: 0, effects: 0, paint: 0 });
      m.frames!++; m.world! += p1 - p0; m.effects! += p2 - p1; m.paint! += performance.now() - p2;
    }

    el.hero.style.opacity = String(landed ? 1 - smooth(door / 0.5) : 0);
    el.hero.style.transform = reduce || door === 0 ? '' : `scale(${1 + door * 1.4})`;
    el.hint.style.visibility = s > 0.02 ? 'hidden' : 'visible';

    if (s >= 0.985 && !arrived) { arrived = true; hooks.onArrive(); }

    if (!atCrossing && !document.hidden) {
      const avg = sampler.add(dtMs);
      if (avg !== null) {
        const n = nextNotch(avg, notch);
        if (n !== notch) { notch = n; rebuild(); }
      }
    }
    document.documentElement.dataset.ready = '1';
  }

  window.addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    mxn = (e.clientX / window.innerWidth) * 2 - 1;
    myn = (e.clientY / window.innerHeight) * 2 - 1;
    hasMouse = e.pointerType === 'mouse';
  });
  window.addEventListener('wheel', () => { cancelAuto(); skip(); }, { passive: true });
  window.addEventListener('touchstart', () => { cancelAuto(); skip(); }, { passive: true });
  window.addEventListener('pointerdown', () => skip());
  window.addEventListener('keydown', e => {
    if (!landed) { skip(); return; }
    if (window.scrollY < window.innerHeight * 0.2 && ['Enter', ' ', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      descend();
    }
  });
  window.addEventListener('resize', rebuild);
  el.hint.addEventListener('click', descend);

  if (opts.skip || reduce) t0 = performance.now() - 60_000;
  const fonts = document.fonts?.load ? document.fonts.load(`10px ${FONT}`) : Promise.resolve();
  const begin = () => {
    rebuild();
    if (!opts.skip && !reduce) t0 = performance.now();
    last = performance.now();
    requestAnimationFrame(tick);
  };
  void Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(begin, begin);

  return { descend, skip };
}
