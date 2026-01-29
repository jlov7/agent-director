import type { StepSummary, TraceSummary } from '../../types';

type Mode = 'cinema' | 'flow' | 'compare';

type DirectorBriefProps = {
  trace: TraceSummary;
  mode: Mode;
  selectedStepId: string | null;
  onModeChange: (mode: Mode) => void;
  onSelectStep: (stepId: string) => void;
  onJumpToBottleneck: () => void;
  onReplay: (stepId: string) => void;
};

function pickBottleneck(steps: StepSummary[]) {
  if (!steps.length) return null;
  return steps.reduce((max, step) => ((step.durationMs ?? 0) > (max.durationMs ?? 0) ? step : max), steps[0]);
}

export default function DirectorBrief({
  trace,
  mode,
  selectedStepId,
  onModeChange,
  onSelectStep,
  onJumpToBottleneck,
  onReplay,
}: DirectorBriefProps) {
  const steps = trace.steps ?? [];
  const bottleneck = pickBottleneck(steps);
  const primaryStepId = selectedStepId ?? bottleneck?.id ?? steps[0]?.id ?? null;
  const wall = trace.metadata.wallTimeMs ?? 0;

  return (
    <aside
      className="inspector inspector-empty"
      data-help
      data-tour="inspector"
      data-help-title="Inspector panel"
      data-help-body="Select a step to open detailed payloads, redaction controls, and replay actions."
      data-help-placement="left"
    >
      <div className="inspector-header">
        <div>
          <div className="inspector-title">Director's notes</div>
          <div className="inspector-subtitle">Select a step to open deep inspection.</div>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Run summary</div>
        <div className="inspector-row">
          <span>Steps</span>
          <span>{steps.length}</span>
        </div>
        <div className="inspector-row">
          <span>Wall time</span>
          <span>{wall}ms</span>
        </div>
        <div className="inspector-row">
          <span>Status</span>
          <span>{trace.status}</span>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Next actions</div>
        <div className="director-actions">
          <button className="primary-button" type="button" onClick={() => onModeChange('cinema')}>
            Open cinema
          </button>
          <button className="ghost-button" type="button" onClick={() => onModeChange('flow')}>
            Switch to flow
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              if (selectedStepId) return;
              if (bottleneck) {
                onJumpToBottleneck();
                return;
              }
              if (primaryStepId) {
                onSelectStep(primaryStepId);
              }
            }}
            disabled={!primaryStepId || Boolean(selectedStepId)}
          >
            {selectedStepId ? 'Inspector open' : bottleneck ? 'Jump to bottleneck' : 'Select first step'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => primaryStepId && onReplay(primaryStepId)}
            disabled={!primaryStepId}
          >
            Replay from step
          </button>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Mode</div>
        <div className="director-modes">
          <button
            className={`ghost-button ${mode === 'cinema' ? 'active' : ''}`}
            type="button"
            onClick={() => onModeChange('cinema')}
          >
            Cinema
          </button>
          <button
            className={`ghost-button ${mode === 'flow' ? 'active' : ''}`}
            type="button"
            onClick={() => onModeChange('flow')}
          >
            Flow
          </button>
          <button className="ghost-button" type="button" disabled>
            Compare
          </button>
        </div>
      </div>
    </aside>
  );
}
