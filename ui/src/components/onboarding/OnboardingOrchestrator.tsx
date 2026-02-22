import FirstWinChecklist, { type FirstWinStep } from './FirstWinChecklist';
import RolePathSelector, { type OnboardingPath } from './RolePathSelector';

export type OnboardingStage = 'select' | 'active' | 'skipped' | 'completed';

type OnboardingOrchestratorProps = {
  stage: OnboardingStage;
  path: OnboardingPath;
  steps: FirstWinStep[];
  explainEnabled: boolean;
  recommendedActionLabel: string;
  helpHref?: string;
  onPathChange: (path: OnboardingPath) => void;
  onStart: () => void;
  onSkipSafely: () => void;
  onStartOver: () => void;
  onStartTour: () => void;
  onToggleExplain: () => void;
  onRecommendedAction: () => void;
};

export default function OnboardingOrchestrator({
  stage,
  path,
  steps,
  explainEnabled,
  recommendedActionLabel,
  helpHref = '/help.html',
  onPathChange,
  onStart,
  onSkipSafely,
  onStartOver,
  onStartTour,
  onToggleExplain,
  onRecommendedAction,
}: OnboardingOrchestratorProps) {
  if (stage === 'select') {
    return (
      <section className="onboarding-orchestrator onboarding-stage-select" aria-label="Onboarding setup">
        <p className="onboarding-eyebrow">First-run setup</p>
        <h2>What are you here to do?</h2>
        <p>Pick one path and we will guide you to a fast first win.</p>
        <RolePathSelector value={path} onChange={onPathChange} />
        <div className="onboarding-orchestrator-actions">
          <button className="primary-button" type="button" onClick={onStart}>
            Start first win
          </button>
          <button className="ghost-button" type="button" onClick={onSkipSafely}>
            Skip for now
          </button>
          <button className="ghost-button" type="button" onClick={onStartTour}>
            Help me around
          </button>
          <a className="ghost-button" href={helpHref} target="_blank" rel="noreferrer">
            Open quick help
          </a>
        </div>
      </section>
    );
  }

  if (stage === 'skipped') {
    return (
      <section className="onboarding-orchestrator onboarding-stage-skipped" aria-label="Onboarding skipped">
        <p className="onboarding-eyebrow">Skipped for now</p>
        <h2>Use one action to get moving.</h2>
        <p>Recommended first action based on your selected path:</p>
        <div className="onboarding-orchestrator-actions">
          <button className="primary-button" type="button" onClick={onRecommendedAction}>
            {recommendedActionLabel}
          </button>
          <button className="ghost-button" type="button" onClick={onStartTour}>
            Help me around
          </button>
          <button className="ghost-button" type="button" onClick={onStartOver}>
            Start over
          </button>
          <a className="ghost-button" href={helpHref} target="_blank" rel="noreferrer">
            Open quick help
          </a>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`onboarding-orchestrator onboarding-stage-${stage}`}
      aria-label={stage === 'completed' ? 'Onboarding complete' : 'Onboarding in progress'}
    >
      <FirstWinChecklist
        path={path}
        steps={steps}
        explainEnabled={explainEnabled}
        recommendedActionLabel={recommendedActionLabel}
        onRecommendedAction={onRecommendedAction}
        onStartTour={onStartTour}
        onToggleExplain={onToggleExplain}
        onStartOver={onStartOver}
      />
    </section>
  );
}
