import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHORTCUT_BINDINGS,
  formatShortcutKey,
  normalizeShortcutBindings,
  setShortcutBinding,
} from './shortcutBindings';

describe('shortcutBindings', () => {
  it('normalizes invalid and duplicate keys', () => {
    const normalized = normalizeShortcutBindings({
      toggleStory: '1',
      toggleExplain: 's',
      startTour: 'S',
      toggleFlow: '   ',
    });
    const values = Object.values(normalized);
    const uniqueCount = new Set(values).size;

    expect(uniqueCount).toBe(values.length);
    expect(values.every((value) => /^[a-z]$/.test(value))).toBe(true);
  });

  it('swaps mappings when assigning a key used by another action', () => {
    const next = setShortcutBinding(DEFAULT_SHORTCUT_BINDINGS, 'toggleStory', DEFAULT_SHORTCUT_BINDINGS.toggleExplain);
    expect(next.toggleStory).toBe(DEFAULT_SHORTCUT_BINDINGS.toggleExplain);
    expect(next.toggleExplain).toBe(DEFAULT_SHORTCUT_BINDINGS.toggleStory);
  });

  it('formats shortcut labels for display', () => {
    expect(formatShortcutKey('g')).toBe('G');
  });
});
