import { useState } from 'react';
import ExecutionTimeline, { type RouteTimelineItem } from '../components/journeys/ExecutionTimeline';
import JourneyActionCard from '../components/journeys/JourneyActionCard';
import type { EvalCase, EvalRun } from '../types';
import type { TraceEvidenceSummary } from '../utils/traceEvidence';
import type { WorkspaceRouteStatus } from './workspaceRouteTypes';

type DiagnoseRouteProps = {
  status: WorkspaceRouteStatus;
  lastCompletedActionId: string | null;
  timelineItems: RouteTimelineItem[];
  onRouteAction: (actionId: string) => void;
  evalCases: EvalCase[];
  evalRun: EvalRun | null;
  evalBusy: boolean;
  evalStatus: string | null;
  traceEvidenceSummary: TraceEvidenceSummary | null;
  onRetryAsyncAction: (id: string) => void;
  onResumeAsyncAction: (id: string) => void;
  onRetryExportTask: (id: string) => void;
  onCreateEvalCase: () => void;
  onRunEvalCases: () => void;
};

export default function DiagnoseRoute({
  status,
  lastCompletedActionId,
  timelineItems,
  onRouteAction,
  evalCases,
  evalRun,
  evalBusy,
  evalStatus,
  traceEvidenceSummary,
  onRetryAsyncAction,
  onResumeAsyncAction,
  onRetryExportTask,
  onCreateEvalCase,
  onRunEvalCases,
}: DiagnoseRouteProps) {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const evalStateLabel = evalRun
    ? `${evalRun.status}: ${evalRun.passedCount}/${evalRun.caseCount} cases`
    : evalCases.length
      ? `${evalCases.length} case${evalCases.length === 1 ? '' : 's'} ready`
      : 'No cases yet';
  const evalProofLabel = evalRun
    ? `${evalRun.passedCount}/${evalRun.caseCount} passing`
    : evalCases.length
      ? 'Cases staged'
      : 'Not promoted';
  const importProofLabel = traceEvidenceSummary
    ? traceEvidenceSummary.warningCount > 0
      ? 'Imported with warnings'
      : 'Imported cleanly'
    : 'No imported trace';
  const commandDeckRows = [
    {
      label: 'Trace',
      value: traceEvidenceSummary ? traceEvidenceSummary.sourceLabel : 'Waiting',
      detail: traceEvidenceSummary ? `Provider ID ${traceEvidenceSummary.providerTraceId}` : 'Import or load a run',
    },
    {
      label: 'Cost',
      value: traceEvidenceSummary ? traceEvidenceSummary.costLabel : 'No spend',
      detail: traceEvidenceSummary ? `${traceEvidenceSummary.tokenLabel} captured` : 'No usage captured',
    },
    {
      label: 'Warnings',
      value: traceEvidenceSummary ? traceEvidenceSummary.warningLabel : 'Unknown',
      detail: traceEvidenceSummary ? 'Importer output is release-visible' : 'No importer output',
    },
    {
      label: 'Eval',
      value: evalStateLabel,
      detail: evalStatus ? 'Eval status updated' : 'Promote trace evidence into release proof',
    },
  ];

  return (
    <div className="workspace-context-grid route-context-grid" data-route-panel="diagnose">
      <article className="workspace-card route-state-card route-focal-card">
        <h3>Diagnose state</h3>
        {status === null ? (
          <>
            <p>No run context yet. Start by observing baseline behavior, then isolate causal chain.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('diagnose-observe-baseline')}>
                Observe baseline
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('diagnose-isolate-cause')}>
                Isolate causal chain
              </button>
            </div>
          </>
        ) : null}
        {status === 'loading' ? (
          <>
            <p>Diagnosis context is loading. Begin with baseline observation once timeline data is ready.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('diagnose-observe-baseline')}>
                Observe baseline
              </button>
            </div>
          </>
        ) : null}
        {status === 'failed' ? (
          <>
            <p>Diagnosis blocked by current failures. Follow observe, isolate, validate, then share.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('diagnose-observe-baseline')}>
                Observe baseline
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('diagnose-isolate-cause')}>
                Isolate causal chain
              </button>
            </div>
          </>
        ) : null}
        {status === 'completed' ? (
          <>
            <p>Diagnosis complete. Capture findings and publish the narrative.</p>
            <p className="route-state-summary">What changed: hypothesis validation and evidence export are ready for team handoff.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('diagnose-share-findings')}>
                Share findings
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('diagnose-validate-hypothesis')}>
                Re-validate hypothesis
              </button>
            </div>
          </>
        ) : null}
        {status === 'running' ? (
          <>
            <p>Run is live. Update diagnosis checkpoints as evidence changes.</p>
            <p className="route-state-summary">Keyboard hint: use keys 1-4 to execute observe, isolate, validate, and share.</p>
          </>
        ) : null}
      </article>

      <JourneyActionCard
        title="Observe baseline"
        outcome="Anchor diagnosis on timeline evidence before branching."
        why="A baseline avoids speculative debugging paths."
        ctaLabel="Observe baseline"
        onCta={() => onRouteAction('diagnose-observe-baseline')}
        resume={lastCompletedActionId === 'diagnose-observe-baseline'}
      />
      <JourneyActionCard
        title="Isolate causal chain"
        outcome="Map dependency path that explains the failure pattern."
        why="Causal isolation narrows root-cause candidates quickly."
        ctaLabel="Isolate causal chain"
        onCta={() => onRouteAction('diagnose-isolate-cause')}
        resume={lastCompletedActionId === 'diagnose-isolate-cause'}
      />
      <JourneyActionCard
        title="Validate hypothesis"
        outcome="Prove or falsify hypothesis with replay matrix evidence."
        why="Validation protects against overfitting to one run."
        ctaLabel="Validate hypothesis"
        onCta={() => onRouteAction('diagnose-validate-hypothesis')}
        resume={lastCompletedActionId === 'diagnose-validate-hypothesis'}
      />
      <JourneyActionCard
        title="Share findings"
        outcome="Export concise narrative and recommended next action."
        why="Shared findings keep response aligned across teams."
        ctaLabel="Share findings"
        onCta={() => onRouteAction('diagnose-share-findings')}
        resume={lastCompletedActionId === 'diagnose-share-findings'}
      />

      <article className="workspace-card route-evidence-card">
        <h3>Trace-to-eval evidence</h3>
        <p>Convert the current trace into a repeatable regression case, then run the suite before release.</p>
        <section className="route-command-deck" aria-label="Trace evidence command deck">
          <div className="route-command-signal" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="route-command-grid">
            {commandDeckRows.map((row) => (
              <div className="route-command-cell" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                <small>{row.detail}</small>
              </div>
            ))}
          </div>
        </section>
        {traceEvidenceSummary ? (
          <dl className="route-evidence-grid" aria-label="Trace cost and provenance summary">
            <div>
              <dt>Source</dt>
              <dd>{traceEvidenceSummary.sourceLabel}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{traceEvidenceSummary.providerLabel}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{traceEvidenceSummary.modelLabel}</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd>{traceEvidenceSummary.tokenLabel}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd>{traceEvidenceSummary.costLabel}</dd>
            </div>
            <div>
              <dt>Latency</dt>
              <dd>{traceEvidenceSummary.wallTimeLabel}</dd>
            </div>
            <div>
              <dt>Slowest</dt>
              <dd>{traceEvidenceSummary.slowestStepLabel}</dd>
            </div>
            <div>
              <dt>Failures</dt>
              <dd>{traceEvidenceSummary.failureLabel}</dd>
            </div>
          </dl>
        ) : null}
        <section className="route-proof-ledger" aria-label="Frontier evidence ledger">
          <div>
            <span>Import proof</span>
            <strong>{importProofLabel}</strong>
            <small>{traceEvidenceSummary?.providerTraceId ?? 'No provider trace bound to this run.'}</small>
          </div>
          <div>
            <span>Eval proof</span>
            <strong>{evalProofLabel}</strong>
            <small>{evalRun ? `Last deterministic run ${evalRun.status}.` : 'Create and run cases to make this release evidence.'}</small>
          </div>
          <div>
            <span>Replay truth</span>
            <strong>{traceEvidenceSummary?.replayModeLabel ?? 'Recorded evidence'}</strong>
            <small>{traceEvidenceSummary?.replayTruthLabel ?? 'No replay branch is being represented as live execution.'}</small>
          </div>
        </section>
        <div className="route-state-actions">
          <button className="primary-button" type="button" onClick={onCreateEvalCase} disabled={evalBusy}>
            Create eval case
          </button>
          <button className="ghost-button" type="button" onClick={onRunEvalCases} disabled={evalBusy || evalCases.length === 0}>
            Run eval suite
          </button>
        </div>
        {evalStatus ? <p className="route-state-summary">{evalStatus}</p> : null}
        {evalRun ? (
          <p className="route-state-summary">
            Last run: {evalRun.status}, {evalRun.passedCount}/{evalRun.caseCount} cases passed.
          </p>
        ) : null}
        {evalCases.length ? (
          <ul className="route-contract-list">
            {evalCases.slice(0, 3).map((evalCase) => (
              <li key={evalCase.id}>
                <strong>{evalCase.name}</strong> · {evalCase.assertions.expectedStatus} · {evalCase.assertions.minStepCount} steps
              </li>
            ))}
          </ul>
        ) : (
          <p className="route-state-summary">No eval cases yet for this workspace.</p>
        )}
      </article>

      <article className="workspace-card route-history-card">
        <h3>Execution history</h3>
        <p>Open detailed async/export timeline only when you need recovery evidence.</p>
        <div className="route-state-actions">
          <button className="ghost-button" type="button" onClick={() => setTimelineOpen((prev) => !prev)}>
            {timelineOpen ? 'Hide execution history' : 'Show execution history'}
          </button>
        </div>
      </article>

      {timelineOpen ? (
        <ExecutionTimeline
          items={timelineItems}
          onRetryAsyncAction={onRetryAsyncAction}
          onResumeAsyncAction={onResumeAsyncAction}
          onRetryExportTask={onRetryExportTask}
        />
      ) : null}
    </div>
  );
}
