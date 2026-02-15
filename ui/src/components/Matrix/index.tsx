import { useMemo, useRef, useState, type ChangeEvent } from 'react';
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
  const [importError, setImportError] = useState<string | null>(null);
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
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onRemoveScenario(scenario.id)}
                  disabled={scenarios.length <= 1}
                >
                  Remove
                </button>
              </article>
            );
          })}
        </div>
        {validationMessage ? <div className="error-banner">{validationMessage}</div> : null}
        {importError ? <div className="error-banner">{importError}</div> : null}
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
                sortedRows.map((row) => (
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
        </div>
        <aside className="matrix-causal">
          <h3>Causal ranking</h3>
          {matrix?.causalRanking?.length ? (
            <ul>
              {matrix.causalRanking.slice(0, 8).map((item) => (
                <li key={item.factor}>
                  <div className="factor-row">
                    <strong>{item.factor}</strong>
                    <span>score {item.score.toFixed(3)}</span>
                  </div>
                  <div className="factor-meta">
                    confidence {(item.confidence * 100).toFixed(0)}% • samples {item.evidence.samples}
                  </div>
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
