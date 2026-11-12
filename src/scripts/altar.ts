import { logoGrid, mountStatic, rasterise } from './sigil';

const DWELL_MS = 2800;

/**
 * The Attributes display: every technology is a visible tile, and one large ASCII logo
 * cycles through them. Hovering or focusing a tile shows that one and holds it.
 */
export function initAltar(section: HTMLElement, reduce: boolean): void {
  const pre = section.querySelector<HTMLElement>('.altar pre');
  const nameEl = section.querySelector<HTMLElement>('.altar-name');
  const groupEl = section.querySelector<HTMLElement>('.altar-group');
  const tiles = [...section.querySelectorAll<HTMLElement>('.tile')];
  if (!pre || !nameEl || !groupEl || !tiles.length) return;

  const cache = new Map<HTMLElement, string[]>();
  let index = -1;
  let held = false;
  let changedAt = 0;
  let stop = () => {};

  function show(i: number): void {
    if (i === index) return;
    index = i;
    changedAt = performance.now();
    const tile = tiles[i]!;
    tiles.forEach((t, k) => t.classList.toggle('lit', k === i));
    let rows = cache.get(tile);
    if (!rows) {
      rows = logoGrid(rasterise(tile.dataset.path ?? null, tile.dataset.mark ?? null));
      cache.set(tile, rows);
    }
    stop();
    stop = mountStatic(pre!, rows, reduce);
    nameEl!.textContent = tile.dataset.name ?? '';
    groupEl!.textContent = (tile.dataset.group ?? '').toUpperCase();
  }

  tiles.forEach((tile, i) => {
    const hold = () => { held = true; show(i); };
    const release = () => { held = false; changedAt = performance.now(); };
    tile.addEventListener('mouseenter', hold);
    tile.addEventListener('focusin', hold);
    tile.addEventListener('mouseleave', release);
    tile.addEventListener('focusout', release);
  });

  window.setInterval(() => {
    if (!section.classList.contains('active') || document.hidden) return;
    if (index < 0) { show(0); return; }
    if (held || reduce) return;
    if (performance.now() - changedAt > DWELL_MS) show((index + 1) % tiles.length);
  }, 300);
}
