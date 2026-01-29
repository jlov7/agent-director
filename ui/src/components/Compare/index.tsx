import type { TraceSummary } from '../../types';
import { diffTraces } from '../../utils/diff';
import { downloadJson } from '../../utils/export';
import TimestampTimeline from '../CinemaMode/TimestampTimeline';

type CompareProps = {
  baseTrace: TraceSummary;
  compareTrace: TraceSummary;
  playheadMs: number;
  onExit: () => void;
  safeExport?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function Compare({ baseTrace, compareTrace, playheadMs, onExit, safeExport }: CompareProps) {
  const diff = diffTraces(baseTrace, compareTrace);
  const baseWall = baseTrace.metadata.wallTimeMs || 1;
  const compareWall = compareTrace.metadata.wallTimeMs || 1;
  const basePct = clamp((playheadMs / baseWall) * 100, 0, 100);
  const comparePct = clamp((playheadMs / compareWall) * 100, 0, 100);
  const diffSummary = {
    generatedAt: new Date().toISOString(),
    base: {
      id: baseTrace.id,
      name: baseTrace.name,
      parentTraceId: baseTrace.parentTraceId,
      startedAt: baseTrace.startedAt,
      endedAt: baseTrace.endedAt,
    },
    compare: {
      id: compareTrace.id,
      name: compareTrace.name,
      parentTraceId: compareTrace.parentTraceId,
      branchPointStepId: compareTrace.branchPointStepId,
      replay: compareTrace.replay,
      startedAt: compareTrace.startedAt,
      endedAt: compareTrace.endedAt,
    },
    deltas: {
      added: diff.addedSteps.length,
      removed: diff.removedSteps.length,
      changed: diff.changedSteps.length,
      costDeltaUsd: diff.costDeltaUsd,
      wallTimeDeltaMs: diff.wallTimeDeltaMs,
    },
    alignment: diff.alignedSteps,
    changedPairs: diff.changedPairs,
    safeExport: Boolean(safeExport),
  };

  return (
    <section
      className="compare-view"
      data-help
      data-help-indicator
      data-tour="compare-view"
      data-help-title="Compare runs"
      data-help-body="Side-by-side playback showing deltas in steps, cost, and wall time after a replay."
      data-help-placement="top"
    >
      <div className="compare-header">
        <div>
          <div className="compare-title">Compare Runs</div>
          <div className="compare-subtitle">
            +{diff.addedSteps.length} steps, {diff.costDeltaUsd.toFixed(3)} USD, {diff.wallTimeDeltaMs}ms
          </div>
        </div>
        <div className="compare-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => downloadJson(`agent-director-diff-${baseTrace.id}-${compareTrace.id}.json`, diffSummary)}
            title="Export diff summary"
            data-help
            data-help-title="Export diff"
            data-help-body="Download a JSON summary you can share or archive."
            data-help-placement="bottom"
          >
            Export diff
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={onExit}
            data-help
            data-help-title="Exit compare"
            data-help-body="Return to the primary run timeline."
            data-help-placement="bottom"
          >
            Exit compare
          </button>
        </div>
      </div>
      <div className="compare-grid">
        <div
          className="compare-pane"
          data-help
          data-help-title="Base run"
          data-help-body="Original timeline for baseline comparison."
          data-help-placement="top"
        >
          <div className="compare-pane-title">Base run</div>
          <TimestampTimeline
            trace={baseTrace}
            steps={baseTrace.steps}
            selectedStepId={null}
            onSelectStep={() => undefined}
            playheadPct={basePct}
            playheadMs={playheadMs}
            windowRange={null}
          />
        </div>
        <div
          className="compare-pane"
          data-help
          data-help-title="Replay run"
          data-help-body="Replay timeline to validate improvements."
          data-help-placement="top"
        >
          <div className="compare-pane-title">Replay run</div>
          <TimestampTimeline
            trace={compareTrace}
            steps={compareTrace.steps}
            selectedStepId={null}
            onSelectStep={() => undefined}
            playheadPct={comparePct}
            playheadMs={playheadMs}
            windowRange={null}
          />
        </div>
      </div>
    </section>
  );
}
