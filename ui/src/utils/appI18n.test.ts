import { describe, expect, it } from 'vitest';
import { appLabel, normalizeAppLocale } from './appI18n';

describe('appI18n', () => {
  it('normalizes unsupported locales to english', () => {
    expect(normalizeAppLocale('fr')).toBe('en');
    expect(normalizeAppLocale(undefined)).toBe('en');
  });

  it('returns localized app labels', () => {
    expect(appLabel('es', 'mode_cinema')).toBe('Cine');
    expect(appLabel('en', 'mode_cinema')).toBe('Cinema');
  });
});
