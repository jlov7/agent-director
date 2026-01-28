import { useEffect } from 'react';

const INTRO_MS = 1800;

type IntroOverlayProps = {
  onComplete: () => void;
};

export default function IntroOverlay({ onComplete }: IntroOverlayProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onComplete(), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="intro-overlay" role="dialog" aria-modal="true" aria-label="Agent Director intro">
      <div className="intro-card">
        <div className="intro-scan" />
        <div className="intro-title">Agent Director</div>
        <div className="intro-tagline">Watch your agent think. Then direct it.</div>
        <div className="intro-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
        <button className="ghost-button" type="button" onClick={onComplete}>
          Skip intro
        </button>
      </div>
    </div>
  );
}
