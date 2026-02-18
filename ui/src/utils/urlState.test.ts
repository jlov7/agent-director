import { describe, expect, it } from 'vitest';
import { buildUrlAppState, parseUrlAppState } from './urlState';

describe('urlState', () => {
  it('parses supported app URL state', () => {
    const state = parseUrlAppState('?mode=matrix&trace=trace-42&step=s9');
    expect(state).toEqual({ mode: 'matrix', traceId: 'trace-42', stepId: 's9' });
  });

  it('ignores unsupported mode values', () => {
    const state = parseUrlAppState('?mode=unknown&trace=trace-42');
    expect(state).toEqual({ traceId: 'trace-42' });
  });

  it('builds URL by replacing app state params while preserving unrelated params', () => {
    const href = 'https://agent-director.vercel.app/?foo=bar';
    const next = buildUrlAppState(href, { mode: 'flow', traceId: 'trace-7', stepId: 's3' });
    const parsed = new URL(next);
    expect(parsed.searchParams.get('foo')).toBe('bar');
    expect(parsed.searchParams.get('mode')).toBe('flow');
    expect(parsed.searchParams.get('trace')).toBe('trace-7');
    expect(parsed.searchParams.get('step')).toBe('s3');
  });

  it('removes app state params when values are omitted', () => {
    const href = 'https://agent-director.vercel.app/?mode=cinema&trace=trace-7&step=s3';
    const next = buildUrlAppState(href, {});
    const parsed = new URL(next);
    expect(parsed.searchParams.get('mode')).toBeNull();
    expect(parsed.searchParams.get('trace')).toBeNull();
    expect(parsed.searchParams.get('step')).toBeNull();
  });
});
