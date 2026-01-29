import type { StepSummary, TraceSummary } from '../../types';

type Mode = 'cinema' | 'flow' | 'compare';

type JourneyPanelProps = {
  trace: TraceSummary;
  mode: Mode;
  playheadMs: number;
  selectedStepId: string | null;
  compareTrace: TraceSummary | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onModeChange: (mode: Mode) => void;
  onSelectStep: (stepId: string) => void;
  onJumpToBottleneck: () => void;
  onReplay: (stepId: string) => void;
  onShowShortcuts: () => void;
  onStartTour?: () => void;
};

type JourneyStatus = 'done' | 'active' | 'next';

type JourneyStep = {
  id: string;
  title: string;
  summary: string;
  status: JourneyStatus;
  actionLabel: string;
  action?: () => void;
  disabled?: boolean;
};

function pickBottleneck(steps: StepSummary[]) {
  if (!steps.length) return null;
  return steps.reduce((max, step) => ((step.durationMs ?? 0) > (max.durationMs ?? 0) ? step : max), steps[0]);
}

export default function JourneyPanel({
  trace,
  mode,
  playheadMs,
  selectedStepId,
  compareTrace,
  collapsed,
  onToggleCollapsed,
  onModeChange,
  onSelectStep,
  onJumpToBottleneck,
  onReplay,
  onShowShortcuts,
  onStartTour,
}: JourneyPanelProps) {
  const steps = trace.steps ?? [];
  const bottleneck = pickBottleneck(steps);
  const primaryStepId = selectedStepId ?? bottleneck?.id ?? steps[0]?.id ?? null;

  const observeDone = mode === 'cinema' || playheadMs > 0;
  const inspectDone = Boolean(selectedStepId);
  const compareDone = Boolean(compareTrace);
  const progress = [observeDone, inspectDone, compareDone].filter(Boolean).length;
  const activeIndex = [observeDone, inspectDone, compareDone].findIndex((done) => !done);
  const currentIndex = activeIndex === -1 ? 2 : activeIndex;

  const statuses: JourneyStatus[] = [0, 1, 2].map((index) => {
    if ([observeDone, inspectDone, compareDone][index]) return 'done';
    return index === currentIndex ? 'active' : 'next';
  });

  const journeySteps: JourneyStep[] = [
    {
      id: 'observe',
      title: 'Act I: Observe',
      summary: 'Scrub the timeline to feel the pacing, bottlenecks, and tool choreography.',
      status: statuses[0],
      actionLabel: 'Enter cinema',
      action: () => onModeChange('cinema'),
    },
    {
      id: 'inspect',
      title: 'Act II: Inspect',
      summary: 'Open the most expensive or failed step and read the payload with context.',
      status: statuses[1],
      actionLabel: bottleneck ? 'Jump to bottleneck' : 'Select first step',
      action: () => {
        if (selectedStepId) {
          onModeChange('cinema');
          return;
        }
        if (bottleneck) {
          onJumpToBottleneck();
          return;
        }
        if (primaryStepId) {
          onSelectStep(primaryStepId);
          onModeChange('cinema');
        }
      },
      disabled: !primaryStepId,
    },
    {
      id: 'direct',
      title: 'Act III: Direct',
      summary: 'Replay from a decisive step, then compare flows and diffs side-by-side.',
      status: statuses[2],
      actionLabel: compareTrace ? 'Open compare' : 'Replay from step',
      action: () => {
        if (compareTrace) {
          onModeChange('compare');
          return;
        }
        if (primaryStepId) {
          onReplay(primaryStepId);
        }
      },
      disabled: !primaryStepId,
    },
  ];

  if (collapsed) {
    return (
      <section
        className="journey-panel journey-collapsed"
        aria-label="Director journey"
        data-help
        data-help-indicator
        data-tour="journey"
        data-help-title="Director journey"
        data-help-body="A guided path from observation to replay. Use it to show newcomers what to do first."
        data-help-placement="bottom"
      >
        <div className="journey-collapsed-main">
          <div className="journey-eyebrow">Director journey</div>
          <div className="journey-collapsed-title">From observe to direct</div>
        </div>
        <div className="journey-collapsed-actions">
          <span className="journey-progress-text">{progress}/3 complete</span>
          <button className="ghost-button" type="button" onClick={onShowShortcuts}>
            Shortcuts
          </button>
          {onStartTour ? (
            <button className="ghost-button" type="button" onClick={onStartTour}>
              Tour
            </button>
          ) : null}
          <button className="primary-button journey-expand" type="button" onClick={onToggleCollapsed}>
            Expand
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="journey-panel"
      aria-label="Director journey"
      data-help
      data-help-indicator
      data-tour="journey"
      data-help-title="Director journey"
      data-help-body="A three-act flow that teaches the story: observe, inspect, direct. Each act jumps to the right place."
      data-help-placement="bottom"
    >
      <div className="journey-head">
        <div>
          <div className="journey-eyebrow">Director journey</div>
          <h2 className="journey-title">Cut a perfect take in three acts.</h2>
          <p className="journey-subtitle">
            Trace the performance, interrogate the moment, then direct a better run.
          </p>
        </div>
        <div className="journey-head-actions">
          <button className="ghost-button" type="button" onClick={onShowShortcuts}>
            Shortcuts
          </button>
          {onStartTour ? (
            <button className="ghost-button" type="button" onClick={onStartTour}>
              Start tour
            </button>
          ) : null}
          <button className="ghost-button" type="button" onClick={onToggleCollapsed}>
            Collapse
          </button>
        </div>
      </div>
      <div className="journey-track">
        {journeySteps.map((step, index) => (
          <div key={step.id} className="journey-card" data-status={step.status}>
            <div className="journey-card-top">
              <span className="journey-index">0{index + 1}</span>
              <span className="journey-status">{step.status}</span>
            </div>
            <h3 className="journey-card-title">{step.title}</h3>
            <p className="journey-card-body">{step.summary}</p>
            <button
              className="primary-button journey-action"
              type="button"
              onClick={step.action}
              disabled={step.disabled}
            >
              {step.actionLabel}
            </button>
          </div>
        ))}
      </div>
      <div className="journey-footer">
        <div>
          <div className="journey-progress-label">Progress</div>
          <div className="journey-progress">
            <span className="journey-progress-bar" style={{ width: `${(progress / 3) * 100}%` }} />
          </div>
        </div>
        <div className="journey-footnote">
          Tip: Use Flow to spot fan-out, Compare to validate your changes.
        </div>
      </div>
    </section>
  );
}
