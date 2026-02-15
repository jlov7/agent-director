export type StepType = 'llm_call' | 'tool_call' | 'decision' | 'handoff' | 'guardrail';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TraceStatus = 'running' | 'completed' | 'failed';
export type ReplayStrategy = 'recorded' | 'live' | 'hybrid';
export type ReplayJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export interface TraceMetadata {
  source: 'openai_agents' | 'langsmith' | 'langfuse' | 'manual' | string;
  agentName: string;
  modelId: string;
  wallTimeMs: number;
  workTimeMs?: number;
  totalTokens?: number;
  totalCostUsd?: number;
  errorCount?: number;
  retryCount?: number;
}

export interface StepMetrics {
  tokensTotal?: number;
  costUsd?: number;
}

export interface StepPreview {
  title?: string;
  subtitle?: string;
  inputPreview?: string;
  outputPreview?: string;
}

export interface StepIo {
  emittedToolCallIds?: string[];
  consumedToolCallIds?: string[];
}

export interface StepSummary {
  id: string;
  index: number;
  type: StepType;
  name: string;
  startedAt: string;
  endedAt: string | null;
  durationMs?: number;
  status: StepStatus;
  error?: string;
  parentStepId?: string;
  childStepIds: string[];
  attempt?: number;
  retryOfStepId?: string;
  metrics?: StepMetrics;
  preview?: StepPreview;
  io?: StepIo;
  toolCallId?: string;
}

export interface ReplayInfo {
  strategy: ReplayStrategy;
  modifiedStepId: string;
  modifications: Record<string, unknown>;
  createdAt: string;
}

export interface ReplayScenarioInput {
  name: string;
  strategy: ReplayStrategy;
  modifications: Record<string, unknown>;
}

export interface ReplayScenarioStatus extends ReplayScenarioInput {
  id: string;
  status: ReplayJobStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  replayTraceId?: string | null;
  error?: string | null;
}

export interface ReplayJob {
  id: string;
  traceId: string;
  stepId: string;
  status: ReplayJobStatus;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  scenarioCount: number;
  completedCount: number;
  failedCount: number;
  canceledCount: number;
  scenarios: ReplayScenarioStatus[];
}

export interface ReplayMatrixRow {
  scenarioId: string;
  name: string;
  strategy: ReplayStrategy;
  status: ReplayJobStatus;
  replayTraceId?: string | null;
  modifications: Record<string, unknown>;
  error?: string | null;
  changedStepIds: string[];
  addedStepIds: string[];
  removedStepIds: string[];
  metrics: {
    costDeltaUsd: number | null;
    wallTimeDeltaMs: number | null;
    errorDelta: number | null;
    retryDelta: number | null;
    changedSteps: number;
    addedSteps: number;
    removedSteps: number;
    invalidatedStepCount: number;
  };
}

export interface CausalFactor {
  factor: string;
  score: number;
  confidence: number;
  evidence: {
    samples: number;
    examples: string[];
    positive: number;
    negative: number;
  };
}

export interface ReplayMatrix {
  jobId: string;
  traceId: string;
  stepId: string;
  rows: ReplayMatrixRow[];
  causalRanking: CausalFactor[];
}

export interface TraceSummary {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  status: TraceStatus;
  metadata: TraceMetadata;
  steps: StepSummary[];
  parentTraceId?: string;
  branchPointStepId?: string;
  replay?: ReplayInfo;
}

export interface RedactionField {
  path: string;
  kind: 'secret' | 'pii' | 'token';
}

export interface RedactionInfo {
  mode: 'redacted' | 'raw';
  fieldsRedacted: RedactionField[];
  revealedFields?: RedactionField[];
}

export interface StepDetails extends StepSummary {
  data: Record<string, unknown>;
  redaction?: RedactionInfo;
}

export interface TraceInsights {
  topLatencySteps: Array<{ stepId: string; name: string; durationMs: number }>;
  costByType: Record<string, number>;
  costByTool?: Record<string, number>;
  costByModel?: Record<string, number>;
  errors: number;
  retries: number;
  wallTimeMs: number;
  workTimeMs: number;
  timing?: {
    degraded: boolean;
    issues: string[];
    missingStepIds?: string[];
    skewedStepIds?: string[];
  };
  ioWarnings?: Array<{
    kind: string;
    message: string;
    stepId?: string;
    toolCallId?: string;
  }>;
  criticalPathMs?: number;
  concurrency?: {
    buckets: Array<{ startMs: number; endMs: number; active: number }>;
    peak: number;
  };
  retryPatterns?: {
    totalRetries: number;
    retryRate: number;
    topRetries: Array<{ stepId: string; count: number }>;
  };
}
