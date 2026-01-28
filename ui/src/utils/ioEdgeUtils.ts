import type { StepSummary } from '../types';

export function buildIoEdgesFromSummary(steps: StepSummary[]) {
  const toolStepByCallId = new Map<string, string>();
  for (const step of steps) {
    if (step.type === 'tool_call' && step.toolCallId) {
      toolStepByCallId.set(step.toolCallId, step.id);
    }
  }

  const edges: Array<{ id: string; source: string; target: string; kind: 'io'; toolCallId: string }> = [];

  for (const step of steps) {
    if (step.type !== 'llm_call' || !step.io) continue;

    for (const callId of step.io.emittedToolCallIds ?? []) {
      const toolStepId = toolStepByCallId.get(callId);
      if (toolStepId) {
        edges.push({
          id: `io_emit_${step.id}_${toolStepId}`,
          source: step.id,
          target: toolStepId,
          kind: 'io',
          toolCallId: callId,
        });
      }
    }

    for (const callId of step.io.consumedToolCallIds ?? []) {
      const toolStepId = toolStepByCallId.get(callId);
      if (toolStepId) {
        edges.push({
          id: `io_consume_${toolStepId}_${step.id}`,
          source: toolStepId,
          target: step.id,
          kind: 'io',
          toolCallId: callId,
        });
      }
    }
  }

  return edges;
}
