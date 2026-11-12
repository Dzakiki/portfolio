import { describe, expect, it } from 'vitest';
import { labelFor } from '../src/scripts/audio';

describe('audio', () => {
  it('labels the toggle', () => {
    expect(labelFor(false)).toBe('SOUND: OFF');
    expect(labelFor(true)).toBe('SOUND: ON');
  });
});
