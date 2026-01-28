import type { StepType } from '../types';

export type StepTypeMeta = {
  label: string;
  icon: string;
  description: string;
};

export const STEP_TYPE_META: Record<StepType, StepTypeMeta> = {
  llm_call: {
    label: 'LLM',
    icon: 'LLM',
    description: 'Model call',
  },
  tool_call: {
    label: 'TOOL',
    icon: 'TOOL',
    description: 'Tool call',
  },
  decision: {
    label: 'DEC',
    icon: 'DEC',
    description: 'Decision',
  },
  handoff: {
    label: 'HAND',
    icon: 'HAND',
    description: 'Handoff',
  },
  guardrail: {
    label: 'GUARD',
    icon: 'GUARD',
    description: 'Guardrail',
  },
};

export function getStepTypeMeta(type: StepType): StepTypeMeta {
  return STEP_TYPE_META[type];
}
