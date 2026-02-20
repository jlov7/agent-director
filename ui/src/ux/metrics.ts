export const JOURNEY_METRIC_STORAGE_KEY = 'agentDirector.analytics.journey.v1';
const MAX_JOURNEY_METRICS = 500;

export type JourneyMetricName =
  | 'journey.first_meaningful_interaction'
  | 'journey.first_success'
  | 'journey.onboarding.exit'
  | 'journey.onboarding.first_value'
  | 'journey.onboarding.abandon';

export type JourneyMetricEvent = {
  name: JourneyMetricName;
  at: string;
  metadata: Record<string, unknown>;
};

const JOURNEY_METRIC_NAMES: JourneyMetricName[] = [
  'journey.first_meaningful_interaction',
  'journey.first_success',
  'journey.onboarding.exit',
  'journey.onboarding.first_value',
  'journey.onboarding.abandon',
];

function isJourneyMetricName(value: unknown): value is JourneyMetricName {
  return typeof value === 'string' && JOURNEY_METRIC_NAMES.includes(value as JourneyMetricName);
}

export function readJourneyMetrics(storage: Storage): JourneyMetricEvent[] {
  try {
    const parsed = JSON.parse(storage.getItem(JOURNEY_METRIC_STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is JourneyMetricEvent => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return (
          isJourneyMetricName(record.name) &&
          typeof record.at === 'string' &&
          record.metadata != null &&
          typeof record.metadata === 'object'
        );
      })
      .slice(-MAX_JOURNEY_METRICS);
  } catch {
    return [];
  }
}

export function appendJourneyMetric(storage: Storage, event: JourneyMetricEvent): JourneyMetricEvent[] {
  const next = [...readJourneyMetrics(storage), event].slice(-MAX_JOURNEY_METRICS);
  storage.setItem(JOURNEY_METRIC_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function trackJourneyMetric(
  storage: Storage,
  name: JourneyMetricName,
  metadata: Record<string, unknown> = {}
): JourneyMetricEvent[] {
  return appendJourneyMetric(storage, {
    name,
    at: new Date().toISOString(),
    metadata,
  });
}

export function trackJourneyMetricOnce(
  storage: Storage,
  onceFlags: Record<string, boolean>,
  onceKey: string,
  name: JourneyMetricName,
  metadata: Record<string, unknown> = {}
): boolean {
  if (onceFlags[onceKey]) return false;
  onceFlags[onceKey] = true;
  trackJourneyMetric(storage, name, metadata);
  return true;
}
