import type { OnboardingPath } from './RolePathSelector';

export type FirstWinStep = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
};

type FirstWinChecklistProps = {
  path: OnboardingPath;
  steps: FirstWinStep[];
  explainEnabled: boolean;
  recommendedActionLabel: string;
  onRecommendedAction: () => void;
  onStartTour: () => void;
  onToggleExplain: () => void;
  onStartOver: () => void;
};

const PATH_COPY: Record<OnboardingPath, string> = {
  evaluate: 'Get a fast read on run quality and risk.',
  operate: 'Stabilize incidents quickly with focused triage.',
  investigate: 'Go deeper with flow and counterfactual analysis.',
};

function getConfidenceLabel(completed: number, total: number) {
  if (total <= 0) return 'Confidence: not started';
  if (completed === 0) return 'Confidence: building';
  if (completed >= total) return 'Confidence: high';
  return 'Confidence: growing';
}

export default function FirstWinChecklist({
  path,
  steps,
  explainEnabled,
  recommendedActionLabel,
  onRecommendedAction,
  onStartTour,
  onToggleExplain,
  onStartOver,
}: FirstWinChecklistProps) {
  const limitedSteps = steps.slice(0, 3);
  const total = limitedSteps.length;
  const completed = limitedSteps.filter((step) => step.done).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="first-win-checklist" aria-label="First win checklist">
      <div className="first-win-header">
        <span className="status-badge">Path: {path}</span>
        <span className="first-win-progress-copy">{completed} of {total} complete</span>
      </div>
      <h2>First win checklist</h2>
      <p>{PATH_COPY[path]}</p>
      <div
        className="first-win-progress"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span className="first-win-progress-track">
          <span className="first-win-progress-fill" style={{ width: `${progress}%` }} />
        </span>
      </div>
      <p className="first-win-confidence">{getConfidenceLabel(completed, total)}</p>
      <ol className="first-win-steps" aria-label="First win steps">
        {limitedSteps.map((step) => (
          <li key={step.id} className={`first-win-step ${step.done ? 'done' : ''}`}>
            <span className="first-win-step-marker" aria-hidden="true">
              {step.done ? '✓' : '○'}
            </span>
            <span className="first-win-step-copy">
              <strong>{step.label}</strong>
              <span>{step.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="first-win-actions">
        <button className="primary-button" type="button" onClick={onRecommendedAction}>
          {recommendedActionLabel}
        </button>
        <button className="ghost-button" type="button" onClick={onStartTour}>
          Help me around
        </button>
        <button
          className={`ghost-button ${explainEnabled ? 'active' : ''}`}
          type="button"
          onClick={onToggleExplain}
          aria-pressed={explainEnabled}
        >
          Explain {explainEnabled ? 'On' : 'Off'}
        </button>
        <button className="ghost-button" type="button" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </section>
  );
}
