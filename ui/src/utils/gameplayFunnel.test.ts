import { beforeEach, describe, expect, it } from 'vitest';
import {
  GAMEPLAY_FUNNEL_STORAGE_KEY,
  readGameplayFunnelEvents,
  recordGameplayFunnelEvent,
} from './gameplayFunnel';

describe('gameplayFunnel', () => {
  beforeEach(() => {
    window.localStorage.removeItem(GAMEPLAY_FUNNEL_STORAGE_KEY);
  });

  it('records and reads gameplay funnel events', () => {
    recordGameplayFunnelEvent('funnel.session_start', { traceId: 'trace-1' });
    const events = readGameplayFunnelEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe('funnel.session_start');
    expect(events[0]?.metadata.traceId).toBe('trace-1');
  });
});
