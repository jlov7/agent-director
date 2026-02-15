import { describe, expect, it } from 'vitest';
import type { StepSummary } from '../types';
import { deriveLaneGroups, laneGroupKeyForStep, normalizeLaneOrder } from './timelineStudio';

const steps: StepSummary[] = [
  {
    id: 's1',
    index: 0,
    type: 'llm_call',
    name: 'Plan',
    startedAt: '2026-02-15T10:00:00Z',
    endedAt: '2026-02-15T10:00:01Z',
    status: 'completed',
    childStepIds: ['s2'],
  },
  {
    id: 's2',
    index: 1,
    type: 'tool_call',
    name: 'Lookup',
    startedAt: '2026-02-15T10:00:02Z',
    endedAt: '2026-02-15T10:00:03Z',
    status: 'failed',
    parentStepId: 's1',
    childStepIds: [],
  },
];

describe('timelineStudio utilities', () => {
  it('derives group keys by strategy', () => {
    expect(laneGroupKeyForStep(steps[0], 'type')).toBe('llm_call');
    expect(laneGroupKeyForStep(steps[1], 'status')).toBe('failed');
    expect(laneGroupKeyForStep(steps[0], 'parent')).toBe('root');
    expect(laneGroupKeyForStep(steps[1], 'parent')).toBe('s1');
  });

  it('derives sorted unique groups', () => {
    expect(deriveLaneGroups(steps, 'type')).toEqual(['llm_call', 'tool_call']);
    expect(deriveLaneGroups(steps, 'status')).toEqual(['completed', 'failed']);
  });

  it('normalizes order and hidden values against known groups', () => {
    const normalized = normalizeLaneOrder(['a', 'b', 'c'], ['b', 'x'], ['a', 'z', 'a']);
    expect(normalized.order).toEqual(['b', 'a', 'c']);
    expect(normalized.hidden).toEqual(['a']);
  });
});
