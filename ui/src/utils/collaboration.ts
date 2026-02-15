export type SessionCursor = {
  sessionId: string;
  traceId: string;
  mode: string;
  playheadMs: number;
  selectedStepId: string | null;
  updatedAt: number;
};

export type SharedAnnotation = {
  id: string;
  traceId: string;
  stepId: string | null;
  body: string;
  authorSessionId: string;
  createdAt: number;
  updatedAt: number;
};

export type ActivityEntry = {
  id: string;
  sessionId: string;
  message: string;
  timestamp: number;
};

export function parseJsonObject<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mergeSharedAnnotations(
  current: SharedAnnotation[],
  incoming: SharedAnnotation[]
): SharedAnnotation[] {
  const merged = new Map<string, SharedAnnotation>();
  [...current, ...incoming].forEach((item) => {
    const existing = merged.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      merged.set(item.id, item);
    }
  });
  return Array.from(merged.values()).sort((left, right) => left.createdAt - right.createdAt);
}

export function truncateActivity(entries: ActivityEntry[], limit = 50): ActivityEntry[] {
  return [...entries].sort((left, right) => right.timestamp - left.timestamp).slice(0, limit);
}
