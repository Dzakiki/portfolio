import { createAudio, labelFor } from './audio';
import { startHero } from './hero';
import { useCanvas } from './scene3d/gl';
import { initInventory, parseHash } from './inventory';

const qs = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || qs.has('still');
if (reduce) document.documentElement.classList.add('still');
history.scrollRestoration = 'manual';

const num = (key: string): number | null => (qs.has(key) ? Number(qs.get(key)) : null);
const canvasEl = document.getElementById('ascii') as HTMLCanvasElement;
// the relics and the cathedral share one renderer, which draws to this canvas
useCanvas(canvasEl);
const invEl = document.getElementById('inv')!;
const audio = createAudio();
const inventory = initInventory(invEl, { reduce, onSelect: () => audio.chime() });
const deep = parseHash(location.hash, inventory.items);

/** The entrance plays once per visit; a refresh or a return in the same tab goes straight to the hero. */
const visit = {
  seen(): boolean { try { return sessionStorage.getItem('entered') === '1'; } catch { return false; } },
  mark(): void { try { sessionStorage.setItem('entered', '1'); } catch { /* storage unavailable: replay next time */ } },
};

startHero(
  {
    canvas: canvasEl,
    hero: document.getElementById('hero')!,
    hint: document.getElementById('hint')!,
    inv: invEl,
  },
  {
    onLand: natural => { visit.mark(); if (natural) audio.bell(); },
    onNave: () => audio.door(),
    onArrive: () => inventory.open(),
  },
  {
    reduce, skip: deep !== null || visit.seen(), frozenT: num('t'), sOverride: num('s'),
    tab: () => inventory.route().tab,
    perf: qs.has('perf'),
  },
);

if (deep) {
  // A deep link opens the inventory directly; it does not wait for the scroll position to get there.
  inventory.go(deep, false);
  inventory.open();
  const land = () => window.scrollTo(0, invEl.offsetTop);
  requestAnimationFrame(land);
  window.addEventListener('load', land, { once: true });
} else {
  window.scrollTo(0, 0);
}

const sound = document.getElementById('sound')!;
sound.addEventListener('click', () => {
  const on = audio.toggle();
  sound.textContent = labelFor(on);
  sound.setAttribute('aria-pressed', String(on));
});
