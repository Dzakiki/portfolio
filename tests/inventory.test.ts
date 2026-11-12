import { describe, expect, it } from 'vitest';
import { formatHash, parseHash, stepItem, stepTab } from '../src/scripts/inventory';

const items = { relics: ['jms', 'tutorguru'], journey: ['oracle'], attributes: [], contact: [] };

describe('routes', () => {
  it('parses a tab and item', () => {
    expect(parseHash('#relics/tutorguru', items)).toEqual({ tab: 'relics', item: 'tutorguru' });
  });
  it('defaults to the first item of a tab', () => {
    expect(parseHash('#journey', items)).toEqual({ tab: 'journey', item: 'oracle' });
  });
  it('gives a null item for tabs without a list', () => {
    expect(parseHash('#contact', items)).toEqual({ tab: 'contact', item: null });
  });
  it('falls back to the first item when the item is unknown', () => {
    expect(parseHash('#relics/nope', items)).toEqual({ tab: 'relics', item: 'jms' });
  });
  it('rejects empty and unknown hashes', () => {
    expect(parseHash('', items)).toBeNull();
    expect(parseHash('#', items)).toBeNull();
    expect(parseHash('#blog', items)).toBeNull();
  });
  it('formats routes back to hashes', () => {
    expect(formatHash({ tab: 'relics', item: 'jms' })).toBe('#relics/jms');
    expect(formatHash({ tab: 'contact', item: null })).toBe('#contact');
  });
  it('round-trips', () => {
    const r = { tab: 'relics' as const, item: 'tutorguru' };
    expect(parseHash(formatHash(r), items)).toEqual(r);
  });
});

describe('stepping', () => {
  it('moves through a list and stops at the ends', () => {
    expect(stepItem(['a', 'b', 'c'], 'a', 1)).toBe('b');
    expect(stepItem(['a', 'b', 'c'], 'c', 1)).toBe('c');
    expect(stepItem(['a', 'b', 'c'], 'a', -1)).toBe('a');
    expect(stepItem([], null, 1)).toBeNull();
  });
  it('moves through tabs and stops at the ends', () => {
    expect(stepTab('journey', 1)).toBe('relics');
    expect(stepTab('journey', -1)).toBe('journey');
    expect(stepTab('contact', 1)).toBe('contact');
  });
});
