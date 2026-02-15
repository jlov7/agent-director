type IntroOverlayProps = {
  onComplete: () => void;
  onStartTour?: () => void;
  onStartStory?: () => void;
  persona?: 'builder' | 'executive' | 'operator';
  onPersonaChange?: (persona: 'builder' | 'executive' | 'operator') => void;
};

const PERSONAS: Array<{ id: 'builder' | 'executive' | 'operator'; label: string; body: string }> = [
  { id: 'builder', label: 'Builder lens', body: 'Focus on step payloads, execution paths, and replay control.' },
  { id: 'executive', label: 'Executive lens', body: 'Focus on bottlenecks, risk, and outcome-level run quality.' },
  { id: 'operator', label: 'Operator lens', body: 'Focus on failures, retries, and trace reliability posture.' },
];

export default function IntroOverlay({
  onComplete,
  onStartTour,
  onStartStory,
  persona = 'builder',
  onPersonaChange,
}: IntroOverlayProps) {
  const handleStartTour = () => {
    onStartTour?.();
    onComplete();
  };

  const handleStartStory = () => {
    onStartStory?.();
    onComplete();
  };

  return (
    <div className="intro-overlay" role="dialog" aria-modal="true" aria-label="Agent Director intro">
      <div className="intro-card">
        <div className="intro-scan" />
        <div className="intro-title">Agent Director</div>
        <div className="intro-tagline">Watch your agent think. Then direct it.</div>
        <div className="intro-steps">
          <div className="intro-step">
            <div className="intro-step-label">Observe</div>
            <div className="intro-step-body">Scrub the timeline to feel pacing and parallelism.</div>
          </div>
          <div className="intro-step">
            <div className="intro-step-label">Inspect</div>
            <div className="intro-step-body">Open the bottleneck to read payloads and costs.</div>
          </div>
          <div className="intro-step">
            <div className="intro-step-label">Direct</div>
            <div className="intro-step-body">Replay from a decisive step and compare runs.</div>
          </div>
        </div>
        <div className="intro-personas" role="group" aria-label="Select onboarding lens">
          {PERSONAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ghost-button intro-persona ${persona === item.id ? 'active' : ''}`}
              onClick={() => onPersonaChange?.(item.id)}
              aria-pressed={persona === item.id}
              aria-label={item.label}
            >
              <span className="intro-persona-label">{item.label}</span>
              <span className="intro-persona-body">{item.body}</span>
            </button>
          ))}
        </div>
        <div className="intro-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="intro-actions">
          <button className="primary-button" type="button" onClick={handleStartTour}>
            Start guided tour
          </button>
          {onStartStory ? (
            <button className="ghost-button" type="button" onClick={handleStartStory}>
              Play story mode
            </button>
          ) : null}
          <button className="ghost-button" type="button" onClick={onComplete}>
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
