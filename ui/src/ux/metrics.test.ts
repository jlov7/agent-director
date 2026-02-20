import { beforeEach, describe, expect, it } from 'vitest';
import {
  JOURNEY_METRIC_STORAGE_KEY,
  appendJourneyMetric,
  readJourneyMetrics,
  trackJourneyMetricOnce,
  type JourneyMetricEvent,
} from './metrics';

describe('journey metrics storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty list for invalid stored payloads', () => {
    window.localStorage.setItem(JOURNEY_METRIC_STORAGE_KEY, 'not-json');
    expect(readJourneyMetrics(window.localStorage)).toEqual([]);
  });

  it('appends a metric event and keeps metadata', () => {
    const event: JourneyMetricEvent = {
      name: 'journey.onboarding.exit',
      at: '2026-02-20T00:00:00Z',
      metadata: { source: 'skip_intro' },
    };
    const firstValueEvent: JourneyMetricEvent = {
      name: 'journey.onboarding.first_value',
      at: '2026-02-20T00:00:01Z',
      metadata: { path: 'evaluate' },
    };
    const abandonEvent: JourneyMetricEvent = {
      name: 'journey.onboarding.abandon',
      at: '2026-02-20T00:00:02Z',
      metadata: { reason: 'skip_for_now', friction: 'none' },
    };

    const next = appendJourneyMetric(window.localStorage, event);
    appendJourneyMetric(window.localStorage, firstValueEvent);
    appendJourneyMetric(window.localStorage, abandonEvent);

    expect(next).toHaveLength(1);
    expect(next[0]).toEqual(event);
    const allEvents = readJourneyMetrics(window.localStorage);
    expect(allEvents.map((item) => item.name)).toEqual([
      'journey.onboarding.exit',
      'journey.onboarding.first_value',
      'journey.onboarding.abandon',
    ]);
  });

  it('records once-only events by key', () => {
    const onceFlags: Record<string, boolean> = {};

    const first = trackJourneyMetricOnce(
      window.localStorage,
      onceFlags,
      'session:first-meaningful',
      'journey.first_meaningful_interaction',
      { label: 'skip intro' }
    );
    const second = trackJourneyMetricOnce(
      window.localStorage,
      onceFlags,
      'session:first-meaningful',
      'journey.first_meaningful_interaction',
      { label: 'skip intro' }
    );

    const events = readJourneyMetrics(window.localStorage);
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe('journey.first_meaningful_interaction');
  });
});
