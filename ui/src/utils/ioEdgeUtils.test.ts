import { buildIoEdgesFromSummary } from './ioEdgeUtils';
import type { StepSummary } from '../types';

test('builds io binding edges from summary', () => {
  const steps: StepSummary[] = [
    {
      id: 'llm1',
      index: 0,
      type: 'llm_call',
      name: 'call tools',
      startedAt: '2026-01-27T10:00:01.000Z',
      endedAt: '2026-01-27T10:00:01.200Z',
      durationMs: 200,
      status: 'completed',
      childStepIds: [],
      io: { emittedToolCallIds: ['tc-1'] },
    },
    {
      id: 'tool1',
      index: 1,
      type: 'tool_call',
      name: 'web_search',
      startedAt: '2026-01-27T10:00:01.200Z',
      endedAt: '2026-01-27T10:00:02.200Z',
      durationMs: 1000,
      status: 'completed',
      childStepIds: [],
      toolCallId: 'tc-1',
    },
    {
      id: 'llm2',
      index: 2,
      type: 'llm_call',
      name: 'analyze',
      startedAt: '2026-01-27T10:00:02.200Z',
      endedAt: '2026-01-27T10:00:03.000Z',
      durationMs: 800,
      status: 'completed',
      childStepIds: [],
      io: { consumedToolCallIds: ['tc-1'] },
    },
  ];

  const edges = buildIoEdgesFromSummary(steps);
  expect(edges).toEqual([
    {
      id: 'io_emit_llm1_tool1',
      source: 'llm1',
      target: 'tool1',
      kind: 'io',
      toolCallId: 'tc-1',
    },
    {
      id: 'io_consume_tool1_llm2',
      source: 'tool1',
      target: 'llm2',
      kind: 'io',
      toolCallId: 'tc-1',
    },
  ]);
});
