import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type {
  ReplayJob,
  ReplayMatrix,
  ReplayScenarioInput,
  ReplayStrategy,
  StepSummary,
} from '../../types';
import { downloadJson, downloadText } from '../../utils/export';
import { buildMatrixExport, buildMatrixMarkdown } from '../../utils/matrixExport';
import { findSensitiveKeys, isPlainObject, redactSensitiveValues } from '../../utils/sensitive';

export type MatrixScenarioDraft = {
  id: string;
  name: string;
  strategy: ReplayStrategy;
  modificationsText: string;
};

type MatrixProps = {
  steps: StepSummary[];
  anchorStepId: string;
  onAnchorStepChange: (stepId: string) => void;
  scenarios: MatrixScenarioDraft[];
  onScenarioChange: (id: string, patch: Partial<MatrixScenarioDraft>) => void;
  onDuplicateScenario: (id: string) => void;
  onMoveScenario: (id: string, direction: 'up' | 'down') => void;
  onAddScenario: () => void;
  onRemoveScenario: (id: string) => void;
  onReplaceScenarios: (next: MatrixScenarioDraft[]) => void;
  onRun: (scenarios: ReplayScenarioInput[]) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  job: ReplayJob | null;
  matrix: ReplayMatrix | null;
  safeExport: boolean;
  onOpenCompare: (traceId: string) => void;
};

type SortKey = 'name' | 'wallTimeDeltaMs' | 'costDeltaUsd' | 'errorDelta' | 'changedSteps';

type ScenarioDiagnostic = {
  id: string;
  name: string;
  parsedModifications: Record<string, unknown>;
  errors: string[];
  sensitiveKeys: string[];
};

type Preset = {
  id: string;
  label: string;
  description: string;
  name: string;
  strategy: ReplayStrategy;
  modifications: Record<string, unknown>;
};

type BatchProfile = {
  id: string;
  label: string;
  description: string;
  scenarios: Array<{ name: string; strategy: ReplayStrategy; modifications: Record<string, unknown> }>;
};

type ScalarField = {
  path: string;
  value: string | number | boolean | null | undefined;
};

const STRATEGIES: ReplayStrategy[] = ['recorded', 'live', 'hybrid'];
const MAX_SCENARIOS = 25;
const PRESETS: Preset[] = [
  {
    id: 'prompt-tighten',
    label: 'Prompt tighten',
    description: 'Shorten or focus the assistant response',
    name: 'Prompt tighter',
    strategy: 'hybrid',
    modifications: { prompt: 'Return concise response' },
  },
  {
    id: 'tool-timeout',
    label: 'Tool timeout',
    description: 'Extend tool timeout for flaky calls',
    name: 'Tool timeout 45s',
    strategy: 'live',
    modifications: { toolTimeoutMs: 45000 },
  },
  {
    id: 'recorded-baseline',
    label: 'Recorded baseline',
    description: 'Pure recorded replay for determinism',
    name: 'Recorded baseline',
    strategy: 'recorded',
    modifications: {},
  },
];

const BATCH_PROFILES: BatchProfile[] = [
  {
    id: 'latency-sweep',
    label: 'Latency sweep',
    description: 'Evaluate timeout adjustments across three live variants.',
    scenarios: [
      { name: 'Timeout 15s', strategy: 'live', modifications: { toolTimeoutMs: 15000 } },
      { name: 'Timeout 30s', strategy: 'live', modifications: { toolTimeoutMs: 30000 } },
      { name: 'Timeout 45s', strategy: 'live', modifications: { toolTimeoutMs: 45000 } },
    ],
  },
  {
    id: 'prompt-spectrum',
    label: 'Prompt spectrum',
    description: 'Compare concise, balanced, and verbose response shaping.',
    scenarios: [
      { name: 'Concise prompt', strategy: 'hybrid', modifications: { prompt: 'Return concise response' } },
      { name: 'Balanced prompt', strategy: 'hybrid', modifications: { prompt: 'Return balanced detail response' } },
      { name: 'Verbose prompt', strategy: 'hybrid', modifications: { prompt: 'Return comprehensive detailed response' } },
    ],
  },
];

function parseMetric(value: number | null) {
  return value == null ? Number.POSITIVE_INFINITY : value;
}

function createScenarioId() {
  return `scenario-${Math.random().toString(36).slice(2, 9)}`;
}

function safeParseModifications(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { value: {} as Record<string, unknown> };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isPlainObject(parsed)) {
      return { error: 'Modifications must be a JSON object.' };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: 'Modifications must be valid JSON.' };
  }
}

function flattenScalars(
  value: Record<string, unknown>,
  prefix = ''
): ScalarField[] {
  const fields: ScalarField[] = [];
  Object.entries(value).forEach(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      typeof nested === 'string' ||
      typeof nested === 'number' ||
      typeof nested === 'boolean' ||
      nested == null
    ) {
      fields.push({ path, value: nested });
      return;
    }
    if (isPlainObject(nested)) {
      fields.push(...flattenScalars(nested as Record<string, unknown>, path));
    }
  });
  return fields;
}

function setValueAtPath(source: Record<string, unknown>, path: string, nextValue: unknown) {
  const keys = path.split('.').filter(Boolean);
  if (keys.length === 0) return source;
  const root: Record<string, unknown> = JSON.parse(JSON.stringify(source));
  let cursor: Record<string, unknown> = root;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index] as string;
    const child = cursor[key];
    if (!isPlainObject(child)) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1] as string] = nextValue;
  return root;
}

function parseScalarInput(input: string): string | number | boolean | null {
  const trimmed = input.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  const maybeNumber = Number(trimmed);
  if (!Number.isNaN(maybeNumber) && trimmed !== '') return maybeNumber;
  return input;
}

function buildScenarioDiff(
  baseline: Record<string, unknown>,
  candidate: Record<string, unknown>
) {
  const baselineFields = new Map(flattenScalars(baseline).map((item) => [item.path, item.value]));
  const candidateFields = flattenScalars(candidate);
  return candidateFields
    .filter((field) => baselineFields.get(field.path) !== field.value)
    .map((field) => ({
      path: field.path,
      from: baselineFields.get(field.path) ?? null,
      to: field.value,
    }));
}

function scalarKind(value: unknown) {
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

function scenarioSignature(scenario: { strategy: ReplayStrategy; modifications: Record<string, unknown> }) {
  return `${scenario.strategy}::${JSON.stringify(scenario.modifications)}`;
}

function findProfileTypeConflicts(profile: BatchProfile) {
  const fieldKinds = new Map<string, Set<string>>();
  profile.scenarios.forEach((scenario) => {
    flattenScalars(scenario.modifications).forEach((field) => {
      const kinds = fieldKinds.get(field.path) ?? new Set<string>();
      kinds.add(scalarKind(field.value));
      fieldKinds.set(field.path, kinds);
    });
  });
  return Array.from(fieldKinds.entries())
    .filter(([, kinds]) => kinds.size > 1)
    .map(([path]) => path);
}

export function toScenarioInput(draft: MatrixScenarioDraft): ReplayScenarioInput {
  const parsed = safeParseModifications(draft.modificationsText);
  return {
    name: draft.name.trim() || 'Unnamed scenario',
    strategy: draft.strategy,
    modifications: parsed.value ?? {},
  };
}

function describeStep(stepId: string, stepMap: Map<string, StepSummary>) {
  const step = stepMap.get(stepId);
  return step ? step.name : stepId;
}

export default function Matrix({
  steps,
  anchorStepId,
  onAnchorStepChange,
  scenarios,
  onScenarioChange,
  onDuplicateScenario,
  onMoveScenario,
  onAddScenario,
  onRemoveScenario,
  onReplaceScenarios,
  onRun,
  onCancel,
  loading,
  error,
  job,
  matrix,
  safeExport,
  onOpenCompare,
}: MatrixProps) {
  const [sortKey, setSortKey] = useState<SortKey>('wallTimeDeltaMs');
  const [sortAsc, setSortAsc] = useState(true);
  const [detailScenarioId, setDetailScenarioId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? '');
  const [profileId, setProfileId] = useState(BATCH_PROFILES[0]?.id ?? '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [simulationWeights, setSimulationWeights] = useState<Record<string, number>>({});
  const [rowRenderLimit, setRowRenderLimit] = useState(25);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stepMap = useMemo(() => new Map(steps.map((step) => [step.id, step])), [steps]);

  const scenarioDiagnostics = useMemo<ScenarioDiagnostic[]>(() => {
    const normalizedNames = scenarios.map((scenario, index) =>
      scenario.name.trim() || `Scenario ${index + 1}`
    );
    const nameCounts = new Map<string, number>();
    normalizedNames.forEach((name) => {
      const key = name.toLowerCase();
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    });

    return scenarios.map((scenario, index) => {
      const name = normalizedNames[index];
      const nameKey = name.toLowerCase();
      const parsed = safeParseModifications(scenario.modificationsText);
      const errors: string[] = [];
      if (parsed.error) errors.push(parsed.error);
      if ((nameCounts.get(nameKey) ?? 0) > 1) {
        errors.push(`Duplicate scenario name: ${name}`);
      }
      const parsedModifications = parsed.value ?? {};
      const sensitiveKeys = parsed.value ? findSensitiveKeys(parsed.value) : [];
      return {
        id: scenario.id,
        name,
        parsedModifications,
        errors,
        sensitiveKeys,
      };
    });
  }, [scenarios]);

  const scenarioErrors = scenarioDiagnostics.reduce((acc, item) => acc + item.errors.length, 0);
  const scenarioLimitError = scenarios.length > MAX_SCENARIOS
    ? `Scenario limit exceeded (${scenarios.length}/${MAX_SCENARIOS}).`
    : null;
  const hasValidationErrors = scenarioErrors > 0 || Boolean(scenarioLimitError);
  const validationMessage = scenarioLimitError
    ? scenarioLimitError
    : scenarioErrors > 0
      ? 'Fix scenario errors before running.'
      : null;
  const canRun = !loading && scenarios.length > 0 && !hasValidationErrors;

  const sortedRows = useMemo(() => {
    const source = matrix?.rows ?? [];
    const sorted = [...source];
    sorted.sort((left, right) => {
      if (sortKey === 'name') {
        return sortAsc ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name);
      }
      if (sortKey === 'changedSteps') {
        const l = left.metrics.changedSteps;
        const r = right.metrics.changedSteps;
        return sortAsc ? l - r : r - l;
      }
      const l = parseMetric(left.metrics[sortKey]);
      const r = parseMetric(right.metrics[sortKey]);
      return sortAsc ? l - r : r - l;
    });
    return sorted;
  }, [matrix?.rows, sortKey, sortAsc]);

  useEffect(() => {
    setRowRenderLimit(25);
  }, [matrix?.jobId, sortKey, sortAsc]);

  const setSort = (next: SortKey) => {
    if (next === sortKey) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortKey(next);
    setSortAsc(true);
  };

  const preparedScenarios = scenarioDiagnostics.map((diag, index) => ({
    name: diag.name,
    strategy: scenarios[index]?.strategy ?? 'hybrid',
    modifications: diag.parsedModifications,
  }));

  const handleRun = () => {
    if (!canRun) return;
    onRun(preparedScenarios);
  };

  const handleAddPreset = () => {
    const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0];
    if (!preset) return;
    onReplaceScenarios([
      ...scenarios,
      {
        id: createScenarioId(),
        name: preset.name,
        strategy: preset.strategy,
        modificationsText: JSON.stringify(preset.modifications, null, 2),
      },
    ]);
  };

  const handleRunProfile = () => {
    const profile = BATCH_PROFILES.find((item) => item.id === profileId);
    if (!profile) {
      setProfileError('Select a valid profile.');
      return;
    }
    const names = profile.scenarios.map((scenario) => scenario.name.toLowerCase());
    const unique = new Set(names);
    if (unique.size !== names.length) {
      setProfileError('Profile has duplicate scenario names.');
      return;
    }
    const signatures = profile.scenarios.map((scenario) => scenarioSignature(scenario));
    if (new Set(signatures).size !== signatures.length) {
      setProfileError('Profile has duplicate scenario payloads.');
      return;
    }
    const typeConflicts = findProfileTypeConflicts(profile);
    if (typeConflicts.length > 0) {
      setProfileError(`Profile has conflicting scalar types: ${typeConflicts.slice(0, 3).join(', ')}`);
      return;
    }
    const drafts = profile.scenarios.map((scenario) => ({
      id: createScenarioId(),
      name: scenario.name,
      strategy: scenario.strategy,
      modificationsText: JSON.stringify(scenario.modifications, null, 2),
    }));
    onReplaceScenarios(drafts);
    setProfileError(null);
    onRun(
      drafts.map((draft) => ({
        name: draft.name,
        strategy: draft.strategy,
        modifications: safeParseModifications(draft.modificationsText).value ?? {},
      }))
    );
  };

  const handleScalarFieldChange = (scenarioId: string, path: string, rawValue: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return;
    const parsed = safeParseModifications(scenario.modificationsText);
    if (!parsed.value) return;
    const updated = setValueAtPath(parsed.value, path, parseScalarInput(rawValue));
    onScenarioChange(scenarioId, {
      modificationsText: JSON.stringify(updated, null, 2),
    });
  };

  const handleExportScenarios = () => {
    const payload = {
      version: 1,
      anchorStepId,
      scenarios: scenarios.map((scenario) => ({
        name: scenario.name,
        strategy: scenario.strategy,
        modificationsText: scenario.modificationsText,
      })),
    };
    downloadJson(`agent-director-scenarios-${anchorStepId || 'matrix'}.json`, payload);
  };

  const handleImportScenarios = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const scenarioList = Array.isArray((payload as { scenarios?: unknown }).scenarios)
        ? (payload as { scenarios: unknown[] }).scenarios
        : Array.isArray(payload)
          ? payload
          : null;
      if (!scenarioList || scenarioList.length === 0) {
        setImportError('Scenario file must include a scenarios array.');
        return;
      }
      if (scenarioList.length > MAX_SCENARIOS) {
        setImportError(`Scenario file exceeds ${MAX_SCENARIOS} scenarios.`);
        return;
      }

      const normalized = scenarioList.map((item, index) => {
        if (!item || typeof item !== 'object') {
          throw new Error('Scenario entries must be objects.');
        }
        const record = item as Record<string, unknown>;
        const name = String(record.name ?? `Scenario ${index + 1}`);
        const strategyRaw = String(record.strategy ?? 'hybrid') as ReplayStrategy;
        const strategy = STRATEGIES.includes(strategyRaw) ? strategyRaw : 'hybrid';
        const modificationsText =
          typeof record.modificationsText === 'string'
            ? record.modificationsText
            : JSON.stringify(record.modifications ?? {}, null, 2);
        return {
          id: createScenarioId(),
          name,
          strategy,
          modificationsText,
        };
      });

      if (
        typeof (payload as { anchorStepId?: unknown }).anchorStepId === 'string' &&
        stepMap.has((payload as { anchorStepId: string }).anchorStepId)
      ) {
        onAnchorStepChange((payload as { anchorStepId: string }).anchorStepId);
      }

      onReplaceScenarios(normalized);
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import scenario file.');
    }
  };

  const sensitiveKeys = useMemo(() => {
    const all = scenarioDiagnostics.flatMap((item) => item.sensitiveKeys);
    return Array.from(new Set(all));
  }, [scenarioDiagnostics]);
  const maxCausalMagnitude = useMemo(() => {
    const ranking = matrix?.causalRanking ?? [];
    if (ranking.length === 0) return 1;
    return Math.max(1, ...ranking.map((item) => Math.abs(item.score)));
  }, [matrix?.causalRanking]);
  const baselineScenario = scenarioDiagnostics[0]?.parsedModifications ?? {};
  const projectedMetrics = useMemo(() => {
    const entries = Object.entries(simulationWeights).filter(([, weight]) => weight !== 0);
    return entries.reduce(
      (acc, [factor, weight]) => {
        const rankingEntry = matrix?.causalRanking.find((item) => item.factor === factor);
        const score = rankingEntry?.score ?? 0;
        const ratio = weight / 100;
        acc.wallTimeMs += score * ratio * 1400;
        acc.costUsd += score * ratio * 0.04;
        acc.errorDelta += score * ratio * 0.7;
        return acc;
      },
      { wallTimeMs: 0, costUsd: 0, errorDelta: 0 }
    );
  }, [matrix?.causalRanking, simulationWeights]);
  const influenceHeatmap = useMemo(() => {
    const counts = new Map<string, number>();
    (matrix?.rows ?? []).forEach((row) => {
      const weight =
        Math.abs(row.metrics.wallTimeDeltaMs ?? 0) +
        Math.abs((row.metrics.costDeltaUsd ?? 0) * 1000) +
        Math.abs(row.metrics.errorDelta ?? 0) * 400;
      row.changedStepIds.forEach((stepId) => {
        counts.set(stepId, (counts.get(stepId) ?? 0) + Math.max(1, weight));
      });
    });
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10);
  }, [matrix?.rows]);
  const maxInfluence = Math.max(1, ...influenceHeatmap.map(([, value]) => value), 1);
  const causalPaths = useMemo(
    () =>
      (matrix?.causalRanking ?? []).slice(0, 5).map((item) => ({
        id: item.factor,
        text: `${item.factor} -> ${item.evidence.examples[0] ?? 'observed change'} -> outcome`,
        confidence: item.confidence,
      })),
    [matrix?.causalRanking]
  );
  const visibleRows = sortedRows.slice(0, rowRenderLimit);

  const handleExportMatrix = () => {
    if (!matrix) return;
    const anchorStepName = stepMap.get(anchorStepId)?.name ?? null;
    const payload = buildMatrixExport({
      job,
      matrix,
      safeExport,
      sensitiveKeys,
      anchorStepName,
    });
    downloadJson(`agent-director-matrix-${matrix.jobId}.json`, payload);
  };

  const handleExportMarkdown = () => {
    if (!matrix) return;
    const anchorStepName = stepMap.get(anchorStepId)?.name ?? null;
    const markdown = buildMatrixMarkdown({
      job,
      matrix,
      safeExport,
      anchorStepName,
    });
    downloadText(`agent-director-matrix-${matrix.jobId}.md`, markdown, 'text/markdown');
  };

  const canCancel = job?.status === 'queued' || job?.status === 'running';
  const detailRow = detailScenarioId
    ? (matrix?.rows ?? []).find((row) => row.scenarioId === detailScenarioId) ?? null
    : null;
  const detailModifications = detailRow
    ? (safeExport ? redactSensitiveValues(detailRow.modifications) : detailRow.modifications)
    : null;

  return (
    <section
      className="matrix-mode"
      data-help
      data-help-title="Matrix mode"
      data-help-body="Run multiple replay scenarios from one anchor and compare outcome deltas with causal ranking."
      data-help-placement="top"
    >
      <div className="matrix-panel">
        <div className="matrix-panel-header">
          <h2>Counterfactual Replay Matrix</h2>
          <div className="matrix-job-state">
            {job ? (
              <>
                <span className={`status-pill status-${job.status}`}>Job: {job.status}</span>
                <span>
                  {job.completedCount}/{job.scenarioCount} completed
                </span>
                {job.failedCount ? <span>{job.failedCount} failed</span> : null}
                {job.canceledCount ? <span>{job.canceledCount} canceled</span> : null}
              </>
            ) : (
              <span>No job yet</span>
            )}
          </div>
        </div>
        <div className="matrix-controls">
          <label>
            Anchor step
            <select value={anchorStepId} onChange={(event) => onAnchorStepChange(event.target.value)}>
              {steps.map((step) => (
                <option key={step.id} value={step.id}>
                  {step.name} ({step.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Preset
            <select
              value={presetId}
              onChange={(event) => setPresetId(event.target.value)}
              data-help
              data-help-title="Scenario presets"
              data-help-body="Insert common experiments like prompt tweaks or recorded baselines."
              data-help-placement="bottom"
            >
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Batch profile
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              {BATCH_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ghost-button"
            onClick={handleAddPreset}
            disabled={loading}
            data-help
            data-help-title="Add preset"
            data-help-body="Append the selected preset as a new scenario."
            data-help-placement="bottom"
          >
            Add preset
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleRunProfile}
            disabled={loading}
            data-help
            data-help-title="Run batch profile"
            data-help-body="Loads and executes a predefined scenario orchestration profile."
            data-help-placement="bottom"
          >
            Run profile
          </button>
          <div className="matrix-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleRun}
              disabled={!canRun}
              data-help
              data-help-title="Run matrix"
              data-help-body="Execute all scenarios sequentially and gather outcome deltas."
              data-help-placement="bottom"
            >
              {loading ? 'Running...' : 'Run matrix'}
            </button>
            <button type="button" className="ghost-button" onClick={onAddScenario} disabled={loading}>
              Add scenario
            </button>
            <button type="button" className="ghost-button" onClick={onCancel} disabled={!canCancel || loading}>
              Cancel job
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportScenarios}
              data-help
              data-help-title="Export scenarios"
              data-help-body="Download the scenario set as JSON for reuse."
              data-help-placement="bottom"
            >
              Export scenarios
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => fileInputRef.current?.click()}
              data-help
              data-help-title="Import scenarios"
              data-help-body="Load a scenario JSON file to repopulate the builder."
              data-help-placement="bottom"
            >
              Import scenarios
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportScenarios}
              className="matrix-file-input"
            />
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportMatrix}
              disabled={!matrix}
              data-help
              data-help-title="Export matrix"
              data-help-body="Download the full matrix JSON with redaction metadata."
              data-help-placement="bottom"
            >
              Export matrix
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportMarkdown}
              disabled={!matrix}
              data-help
              data-help-title="Export summary"
              data-help-body="Download a markdown summary for sharing."
              data-help-placement="bottom"
            >
              Export summary
            </button>
          </div>
        </div>
        <div className="matrix-presets">
          {PRESETS.map((preset) => (
            <div key={preset.id} className="matrix-preset">
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </div>
          ))}
          {BATCH_PROFILES.filter((profile) => profile.id === profileId).map((profile) => (
            <div key={profile.id} className="matrix-preset profile">
              <strong>{profile.label}</strong>
              <span>{profile.description}</span>
            </div>
          ))}
        </div>
        <div className="matrix-scenarios">
          {scenarios.map((scenario, index) => {
            const diag = scenarioDiagnostics[index];
            return (
              <article className="matrix-scenario" key={scenario.id}>
                <div className="matrix-scenario-head">
                  <input
                    value={scenario.name}
                    onChange={(event) => onScenarioChange(scenario.id, { name: event.target.value })}
                    placeholder="Scenario name"
                  />
                  <select
                    value={scenario.strategy}
                    onChange={(event) =>
                      onScenarioChange(scenario.id, { strategy: event.target.value as ReplayStrategy })
                    }
                  >
                    {STRATEGIES.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={scenario.modificationsText}
                  onChange={(event) =>
                    onScenarioChange(scenario.id, { modificationsText: event.target.value })
                  }
                  rows={3}
                  spellCheck={false}
                  aria-label={`Scenario ${scenario.name} modifications`}
                />
                {diag ? (
                  <div className="matrix-schema-editor">
                    <strong>Schema-aware scalar editor</strong>
                    <div className="matrix-schema-grid">
                      {flattenScalars(diag.parsedModifications).slice(0, 8).map((field) => (
                        <label key={`${scenario.id}-${field.path}`} className="matrix-schema-field">
                          <span>{field.path}</span>
                          <input
                            value={String(field.value ?? '')}
                            onChange={(event) =>
                              handleScalarFieldChange(scenario.id, field.path, event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="matrix-diff-preview">
                  <strong>Diff vs baseline</strong>
                  <div className="matrix-diff-list">
                    {buildScenarioDiff(baselineScenario, diag?.parsedModifications ?? {}).slice(0, 6).map((item) => (
                      <div key={`${scenario.id}-${item.path}`} className="matrix-diff-item">
                        <span>{item.path}</span>
                        <span>
                          {String(item.from)} {'->'} {String(item.to)}
                        </span>
                      </div>
                    ))}
                    {buildScenarioDiff(baselineScenario, diag?.parsedModifications ?? {}).length === 0 ? (
                      <div className="matrix-diff-item">No scalar changes from baseline.</div>
                    ) : null}
                  </div>
                </div>
                {diag?.errors.length ? (
                  <div className="matrix-scenario-error">
                    {diag.errors.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                ) : null}
                {diag?.sensitiveKeys.length ? (
                  <div className="matrix-scenario-warning">
                    Sensitive keys: {diag.sensitiveKeys.join(', ')}
                  </div>
                ) : null}
                <div className="matrix-scenario-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onDuplicateScenario(scenario.id)}
                    disabled={loading}
                  >
                    Duplicate scenario
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onMoveScenario(scenario.id, 'up')}
                    disabled={loading || index === 0}
                  >
                    Move scenario up
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onMoveScenario(scenario.id, 'down')}
                    disabled={loading || index === scenarios.length - 1}
                  >
                    Move scenario down
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onRemoveScenario(scenario.id)}
                    disabled={scenarios.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {validationMessage ? <div className="error-banner">{validationMessage}</div> : null}
        {importError ? <div className="error-banner">{importError}</div> : null}
        {profileError ? <div className="error-banner">{profileError}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
      </div>

      <div className="matrix-results">
        <div className="matrix-table-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="table-sort" onClick={() => setSort('name')}>
                    Scenario
                  </button>
                </th>
                <th>Status</th>
                <th>
                  <button type="button" className="table-sort" onClick={() => setSort('wallTimeDeltaMs')}>
                    Wall Δ (ms)
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => setSort('costDeltaUsd')}>
                    Cost Δ (USD)
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => setSort('errorDelta')}>
                    Errors Δ
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => setSort('changedSteps')}>
                    Changed
                  </button>
                </th>
                <th>Details</th>
                <th>Compare</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>No matrix results yet. Run a job to populate this table.</td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.scenarioId}>
                    <td>{row.name}</td>
                    <td title={row.error ?? undefined}>{row.status}</td>
                    <td>{row.metrics.wallTimeDeltaMs ?? 'n/a'}</td>
                    <td>{row.metrics.costDeltaUsd ?? 'n/a'}</td>
                    <td>{row.metrics.errorDelta ?? 'n/a'}</td>
                    <td>{row.metrics.changedSteps}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setDetailScenarioId(row.scenarioId)}
                      >
                        Details
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={!row.replayTraceId}
                        onClick={() => row.replayTraceId && onOpenCompare(row.replayTraceId)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {sortedRows.length > visibleRows.length ? (
            <div className="matrix-table-more">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setRowRenderLimit((prev) => Math.min(sortedRows.length, prev + 25))}
              >
                Load more rows ({visibleRows.length}/{sortedRows.length})
              </button>
            </div>
          ) : null}
        </div>
        <aside className="matrix-causal">
          <h3>Causal ranking</h3>
          {matrix?.causalRanking?.length ? (
            <>
              <ul>
                {matrix.causalRanking.slice(0, 8).map((item) => (
                  <li key={item.factor}>
                    <div className="factor-row">
                      <strong>{item.factor}</strong>
                      <span>score {item.score.toFixed(3)}</span>
                    </div>
                    <div className="factor-bar-track" role="presentation">
                      <div
                        className={`factor-bar-fill ${item.score >= 0 ? 'positive' : 'negative'}`}
                        style={{ width: `${Math.max(6, (Math.abs(item.score) / maxCausalMagnitude) * 100)}%` }}
                      />
                    </div>
                    <div className="factor-meta">
                      confidence {(item.confidence * 100).toFixed(0)}% • samples {item.evidence.samples}
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={simulationWeights[item.factor] ?? 0}
                      aria-label={`Simulate ${item.factor}`}
                      onChange={(event) =>
                        setSimulationWeights((prev) => ({
                          ...prev,
                          [item.factor]: Number(event.target.value),
                        }))
                      }
                    />
                    {item.evidence.examples.length ? (
                      <div className="factor-chips">
                        {item.evidence.examples.map((example) => (
                          <span key={example} className="factor-chip">
                            {example}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="matrix-projected">
                <h4>Projected impact (simulation)</h4>
                <div className="matrix-projected-grid">
                  <span>Wall Δ {projectedMetrics.wallTimeMs.toFixed(0)} ms</span>
                  <span>Cost Δ {projectedMetrics.costUsd.toFixed(3)} USD</span>
                  <span>Error Δ {projectedMetrics.errorDelta.toFixed(2)}</span>
                </div>
              </div>
              <div className="matrix-heatmap">
                <h4>Step influence heatmap</h4>
                {influenceHeatmap.map(([stepId, value]) => (
                  <div key={stepId} className="matrix-heatmap-row">
                    <span>{describeStep(stepId, stepMap)}</span>
                    <span
                      className="matrix-heatmap-bar"
                      style={{ width: `${Math.max(5, (value / maxInfluence) * 100)}%` }}
                    />
                  </div>
                ))}
                {influenceHeatmap.length === 0 ? <p>No influence data yet.</p> : null}
              </div>
              <div className="matrix-paths">
                <h4>Causal path explorer</h4>
                {causalPaths.map((path) => (
                  <div key={path.id} className="matrix-path-item">
                    <span>{path.text}</span>
                    <span>{(path.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
                {causalPaths.length === 0 ? <p>No paths available.</p> : null}
              </div>
            </>
          ) : (
            <p>No causal ranking yet.</p>
          )}
        </aside>
        {detailRow ? (
          <aside className="matrix-detail" role="dialog" aria-label="Scenario details">
            <div className="matrix-detail-header">
              <div>
                <h3>Scenario details</h3>
                <p className="matrix-detail-subtitle">
                  {detailRow.name} • {detailRow.status}
                </p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setDetailScenarioId(null)}>
                Close
              </button>
            </div>
            <div className="matrix-detail-grid">
              <div className="matrix-detail-block">
                <h4>Modifications</h4>
                {safeExport ? (
                  <p className="matrix-detail-note">Safe export enabled: sensitive keys are redacted.</p>
                ) : null}
                <pre>{JSON.stringify(detailModifications ?? {}, null, 2)}</pre>
              </div>
              <div className="matrix-detail-block">
                <h4>Change summary</h4>
                <div className="matrix-detail-metrics">
                  <span>Changed: {detailRow.metrics.changedSteps}</span>
                  <span>Added: {detailRow.metrics.addedSteps}</span>
                  <span>Removed: {detailRow.metrics.removedSteps}</span>
                  <span>Invalidated: {detailRow.metrics.invalidatedStepCount}</span>
                </div>
                <div className="matrix-detail-steps">
                  <strong>Top changed steps</strong>
                  <div className="matrix-step-chips">
                    {detailRow.changedStepIds.length ? (
                      detailRow.changedStepIds.slice(0, 6).map((stepId) => (
                        <span key={stepId} className="matrix-step-chip" title={stepId}>
                          {describeStep(stepId, stepMap)}
                        </span>
                      ))
                    ) : (
                      <span className="matrix-step-chip">None</span>
                    )}
                  </div>
                  {detailRow.changedStepIds.length > 6 ? (
                    <div className="matrix-step-more">
                      +{detailRow.changedStepIds.length - 6} more steps changed
                    </div>
                  ) : null}
                </div>
                {detailRow.error ? <div className="matrix-detail-error">{detailRow.error}</div> : null}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
