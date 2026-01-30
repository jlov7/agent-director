type HeroRibbonProps = {
  explainMode: boolean;
  storyActive: boolean;
  onStartTour: () => void;
  onStartStory: () => void;
  onToggleExplain: () => void;
  onDismiss: () => void;
};

export default function HeroRibbon({
  explainMode,
  storyActive,
  onStartTour,
  onStartStory,
  onToggleExplain,
  onDismiss,
}: HeroRibbonProps) {
  return (
    <section
      className="hero-ribbon"
      aria-label="Director briefing"
      data-help
      data-help-indicator
      data-tour="hero"
      data-help-title="Director briefing"
      data-help-body="Start the tour, play story mode, or enable explain to learn the interface instantly."
      data-help-placement="bottom"
    >
      <div className="hero-ribbon-top">
        <span className="hero-eyebrow">Director briefing</span>
        <button className="ghost-button hero-dismiss" type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <div className="hero-title">Observe. Inspect. Direct.</div>
      <div className="hero-subtitle">
        A cinematic control room for agent traces. See time, read structure, then replay with confidence.
      </div>
      <div className="hero-pills">
        <span className="hero-pill" data-tone="observe">
          Observe
        </span>
        <span className="hero-pill" data-tone="inspect">
          Inspect
        </span>
        <span className="hero-pill" data-tone="direct">
          Direct
        </span>
      </div>
      <div className="hero-actions">
        <button className="primary-button" type="button" onClick={onStartTour}>
          Start guided tour
        </button>
        <button className="ghost-button" type="button" onClick={onStartStory} disabled={storyActive}>
          {storyActive ? 'Story running' : 'Play story mode'}
        </button>
        <button
          className={`ghost-button ${explainMode ? 'active' : ''}`}
          type="button"
          onClick={onToggleExplain}
          aria-pressed={explainMode}
        >
          Explain {explainMode ? 'On' : 'Off'}
        </button>
      </div>
    </section>
  );
}
