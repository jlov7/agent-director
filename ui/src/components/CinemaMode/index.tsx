import type { StepSummary, TraceSummary } from '../../types';
import TimestampTimeline from './TimestampTimeline';
import type { LaneStrategy } from '../../utils/timelineStudio';

type CinemaModeProps = {
  trace: TraceSummary;
  steps: StepSummary[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  playheadMs: number;
  windowRange?: { startMs: number; endMs: number } | null;
  timing?: { degraded: boolean; issues: string[] };
  ghostTrace?: TraceSummary | null;
  diff?: {
    addedSteps: string[];
    removedSteps: string[];
    changedSteps: string[];
    changedPairs?: Array<{ leftId: string; rightId: string }>;
  } | null;
  laneStrategy: LaneStrategy;
  laneGroupsOrder: string[];
  hiddenLaneGroups: string[];
  onLaneStrategyChange: (strategy: LaneStrategy) => void;
  onToggleLaneGroupVisibility: (groupKey: string) => void;
  onMoveLaneGroup: (groupKey: string, direction: 'up' | 'down') => void;
};

export default function CinemaMode({
  trace,
  steps,
  selectedStepId,
  onSelectStep,
  playheadMs,
  windowRange,
  timing,
  ghostTrace,
  diff,
  laneStrategy,
  laneGroupsOrder,
  hiddenLaneGroups,
  onLaneStrategyChange,
  onToggleLaneGroupVisibility,
  onMoveLaneGroup,
}: CinemaModeProps) {
  const wallTimeMs = trace.metadata.wallTimeMs || 1;
  const playheadPct = Math.min(100, Math.max(0, (playheadMs / wallTimeMs) * 100));
  const visibleLaneCount = laneGroupsOrder.filter((group) => !hiddenLaneGroups.includes(group)).length;
  return (
    <section className="cinema-mode" aria-label="Cinema mode">
      {timing?.degraded ? (
        <div className="timing-banner" title={timing.issues.join(' ')}>
          Timing degraded: {timing.issues[0] ?? 'Check timestamps.'}
        </div>
      ) : null}
      <div className="timeline-studio-panel" data-help data-help-title="Timeline studio" data-help-body="Regroup lanes by type/status/parent, hide noisy groups, and reorder emphasis.">
        <label className="timeline-studio-strategy">
          Lane strategy
          <select
            value={laneStrategy}
            onChange={(event) => onLaneStrategyChange(event.target.value as LaneStrategy)}
          >
            <option value="type">Type</option>
            <option value="status">Status</option>
            <option value="parent">Parent branch</option>
          </select>
        </label>
        <div className="timeline-studio-summary">
          {visibleLaneCount}/{laneGroupsOrder.length} groups visible
        </div>
        <div className="timeline-studio-groups">
          {laneGroupsOrder.map((group, index) => {
            const hidden = hiddenLaneGroups.includes(group);
            return (
              <div key={group} className={`timeline-studio-group ${hidden ? 'is-hidden' : ''}`}>
                <button type="button" className="ghost-button" onClick={() => onToggleLaneGroupVisibility(group)}>
                  {hidden ? 'Show' : 'Hide'}
                </button>
                <span className="timeline-studio-group-name">{group}</span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onMoveLaneGroup(group, 'up')}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onMoveLaneGroup(group, 'down')}
                  disabled={index === laneGroupsOrder.length - 1}
                >
                  Down
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <TimestampTimeline
        trace={trace}
        steps={steps}
        selectedStepId={selectedStepId}
        onSelectStep={onSelectStep}
        playheadPct={playheadPct}
        playheadMs={playheadMs}
        windowRange={windowRange}
        ghostTrace={ghostTrace}
        diff={diff}
        laneStrategy={laneStrategy}
        laneGroupsOrder={laneGroupsOrder}
        hiddenLaneGroups={hiddenLaneGroups}
      />
    </section>
  );
}
