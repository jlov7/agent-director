import { useEffect } from 'react';

const INTRO_MS = 2800;

type IntroOverlayProps = {
  onComplete: () => void;
  onStartTour?: () => void;
};

export default function IntroOverlay({ onComplete, onStartTour }: IntroOverlayProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onComplete(), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const handleStartTour = () => {
    onStartTour?.();
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
          <button className="ghost-button" type="button" onClick={onComplete}>
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
