import { describe, expect, it } from 'vitest';
import { mergeSharedAnnotations, parseJsonObject, truncateActivity, type SharedAnnotation } from './collaboration';

describe('collaboration utilities', () => {
  it('parses json object with fallback on invalid payload', () => {
    expect(parseJsonObject('{"ok":true}', { ok: false })).toEqual({ ok: true });
    expect(parseJsonObject('bad json', { ok: false })).toEqual({ ok: false });
    expect(parseJsonObject(null, { ok: false })).toEqual({ ok: false });
  });

  it('merges annotations by newest update timestamp', () => {
    const base: SharedAnnotation[] = [
      {
        id: 'a1',
        traceId: 't1',
        stepId: null,
        body: 'old',
        authorSessionId: 's1',
        createdAt: 1,
        updatedAt: 2,
      },
    ];
    const incoming: SharedAnnotation[] = [
      {
        id: 'a1',
        traceId: 't1',
        stepId: null,
        body: 'new',
        authorSessionId: 's2',
        createdAt: 1,
        updatedAt: 3,
      },
      {
        id: 'a2',
        traceId: 't1',
        stepId: 's3',
        body: 'another',
        authorSessionId: 's3',
        createdAt: 4,
        updatedAt: 4,
      },
    ];
    const merged = mergeSharedAnnotations(base, incoming);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe('a1');
    expect(merged[0]?.body).toBe('new');
    expect(merged[1]?.id).toBe('a2');
  });

  it('truncates activity to newest entries', () => {
    const entries = Array.from({ length: 5 }, (_, index) => ({
      id: `id-${index}`,
      sessionId: 'session',
      message: `message-${index}`,
      timestamp: index + 1,
    }));
    const trimmed = truncateActivity(entries, 3);
    expect(trimmed.map((item) => item.id)).toEqual(['id-4', 'id-3', 'id-2']);
  });
});
