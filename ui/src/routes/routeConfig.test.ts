import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UX_REBOOT_ROUTE,
  UX_REBOOT_ROUTES,
  parseUxRebootRoute,
  type UxRebootRoute,
} from './routeConfig';

describe('ux reboot route config', () => {
  it('exposes the expected canonical route ids', () => {
    expect(UX_REBOOT_ROUTES).toEqual(['overview', 'triage', 'diagnose', 'coordinate', 'settings']);
    expect(DEFAULT_UX_REBOOT_ROUTE).toBe('overview');
  });

  it('parses valid route ids and falls back to default', () => {
    const valid: UxRebootRoute = parseUxRebootRoute('triage');
    const fallback = parseUxRebootRoute('invalid-route');

    expect(valid).toBe('triage');
    expect(fallback).toBe(DEFAULT_UX_REBOOT_ROUTE);
  });
});
