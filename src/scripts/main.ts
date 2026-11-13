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

// An earlier version remembered that the entrance had played and skipped it afterwards. Browsers
// that restore tabs kept that memory indefinitely, so the entrance never came back. Clear it.
try { sessionStorage.removeItem('entered'); } catch { /* storage unavailable */ }

startHero(
  {
    canvas: canvasEl,
    hero: document.getElementById('hero')!,
    hint: document.getElementById('hint')!,
    inv: invEl,
  },
  {
    onLand: natural => { if (natural) audio.bell(); },
    onNave: () => audio.door(),
    onArrive: () => inventory.open(),
  },
  {
    // the entrance plays on every load; only a link straight to a tab or project skips it
    reduce, skip: deep !== null, frozenT: num('t'), sOverride: num('s'),
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
