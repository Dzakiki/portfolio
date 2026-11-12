import { initAltar } from './altar';
import { clamp } from './math';
import { createStage, mountRelic, renderRelic, type RelicShape } from './relic3d';

export type TabId = 'relics' | 'journey' | 'attributes' | 'contact';
export const TABS: TabId[] = ['journey', 'relics', 'attributes', 'contact'];

export interface Route { tab: TabId; item: string | null }

export interface Inventory {
  items: Record<TabId, string[]>;
  route(): Route;
  go(route: Route, push?: boolean): void;
  open(): void;
}

export function parseHash(hash: string, items: Record<TabId, string[]>): Route | null {
  const m = /^#([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(hash);
  if (!m) return null;
  const tab = m[1] as TabId;
  if (!TABS.includes(tab)) return null;
  const list = items[tab];
  const first = list[0] ?? null;
  return { tab, item: m[2] && list.includes(m[2]) ? m[2] : first };
}

export function formatHash(r: Route): string {
  return `#${r.tab}${r.item ? `/${r.item}` : ''}`;
}

export function stepItem(list: string[], current: string | null, delta: 1 | -1): string | null {
  if (!list.length) return null;
  const i = Math.max(0, list.indexOf(current ?? ''));
  return list[clamp(i + delta, 0, list.length - 1)]!;
}

export function stepTab(current: TabId, delta: 1 | -1): TabId {
  return TABS[clamp(TABS.indexOf(current) + delta, 0, TABS.length - 1)]!;
}

export function initInventory(root: HTMLElement, opts: { reduce: boolean; onSelect?: () => void }): Inventory {
  const sections = new Map<TabId, HTMLElement>();
  const items = { relics: [], journey: [], attributes: [], contact: [] } as Record<TabId, string[]>;
  for (const sec of root.querySelectorAll<HTMLElement>('section.tab')) {
    const id = sec.dataset.tab as TabId;
    sections.set(id, sec);
    items[id] = [...sec.querySelectorAll<HTMLElement>('.item')].map(a => a.dataset.item!);
  }
  const tabLinks = [...root.querySelectorAll<HTMLAnchorElement>('.tabs a')];

  let current: Route = { tab: TABS[0]!, item: items[TABS[0]!][0] ?? null };
  let opened = false;
  let shown: TabId | null = null;
  // Relics: one shared stage, and a small still rendering in each alcove.
  const relicsSec = sections.get('relics');
  const stagePre = relicsSec?.querySelector<HTMLElement>('pre.stage3d');
  const relicStage = stagePre ? createStage(stagePre, opts.reduce, () => opened && current.tab === 'relics') : null;
  for (const thumb of relicsSec?.querySelectorAll<HTMLElement>('pre.thumb') ?? []) {
    thumb.textContent = renderRelic(thumb.dataset.relic as RelicShape, 0.25, 36, 21).join('\n');
  }

  /** A lone relic currently turning (the Contact bell), and the element it is drawn into. */
  let stage: HTMLElement | null = null;
  let stopStage = () => {};

  function showCard(sec: HTMLElement, quick: boolean): void {
    const card = sec.querySelector<HTMLElement>('.card');
    if (!card) return;
    card.classList.remove('in');
    card.classList.toggle('quick', quick);
    void card.offsetWidth; // restart the transition
    card.classList.add('in');
  }

  function render(announce: boolean): void {
    const { tab, item } = current;
    for (const [id, sec] of sections) sec.classList.toggle('active', id === tab);
    for (const a of tabLinks) {
      const on = a.dataset.tab === tab;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    }
    const sec = sections.get(tab)!;
    if (opened && shown !== tab) { showCard(sec, shown !== null); shown = tab; }

    let changed = false;
    for (const a of sec.querySelectorAll<HTMLElement>('.item')) a.classList.toggle('sel', a.dataset.item === item);
    for (const d of sec.querySelectorAll<HTMLElement>('.detail')) {
      const sel = d.dataset.item === item;
      if (sel && !d.classList.contains('sel')) changed = true;
      d.classList.toggle('sel', sel);
    }

    if (!opened) return;
    if (tab === 'relics') {
      const shape = sec.querySelector<HTMLElement>('.detail.sel')?.dataset.relic;
      if (shape) relicStage?.show(shape as RelicShape);
    }
    const next = sec.querySelector<HTMLElement>('pre.stage[data-relic]');
    if (next !== stage) {
      stopStage();
      stopStage = () => {};
      stage = next;
      if (next) stopStage = mountRelic(next, next.dataset.relic as RelicShape, opts.reduce);
    }
    if (announce && changed) opts.onSelect?.();
  }

  function go(route: Route, push = true): void {
    const same = route.tab === current.tab && route.item === current.item;
    current = route;
    if (push && !same) history.pushState(null, '', formatHash(route));
    render(push);
  }

  function open(): void {
    if (opened) return;
    opened = true;
    root.classList.add('open');
    render(false);
  }

  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    a.addEventListener('click', e => {
      const r = parseHash(a.getAttribute('href')!, items);
      if (!r) return;
      e.preventDefault();
      const changesTab = r.tab !== current.tab;
      go(r);
      // a new tab starts from its top; choosing an item within a tab leaves the page where it is
      if (changesTab && window.scrollY > root.offsetTop) window.scrollTo(0, root.offsetTop);
    });
  }

  window.addEventListener('popstate', () => {
    const r = parseHash(location.hash, items);
    if (r) go(r, false);
  });

  window.addEventListener('keydown', e => {
    if (!opened || window.scrollY < root.offsetTop - window.innerHeight * 0.5) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const list = items[current.tab];
    let next: Route | null = null;
    if (list.length && e.key === 'ArrowDown') next = { tab: current.tab, item: stepItem(list, current.item, 1) };
    else if (list.length && e.key === 'ArrowUp') next = { tab: current.tab, item: stepItem(list, current.item, -1) };
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const tab = stepTab(current.tab, e.key === 'ArrowRight' ? 1 : -1);
      next = { tab, item: items[tab][0] ?? null };
    }
    if (!next) return;
    e.preventDefault();
    go(next);
  });

  const attributes = sections.get('attributes');
  if (attributes) initAltar(attributes, opts.reduce);

  render(false);
  return { items, route: () => current, go, open };
}
