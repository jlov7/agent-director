type StoryModeBannerProps = {
  active: boolean;
  label: string;
  step: number;
  total: number;
  onStop: () => void;
  onRestart: () => void;
};

export default function StoryModeBanner({ active, label, step, total, onStop, onRestart }: StoryModeBannerProps) {
  if (!active) return null;

  const progress = total > 0 ? ((step + 1) / total) * 100 : 0;

  return (
    <div className="story-banner" role="status" aria-live="polite">
      <div className="story-banner-main">
        <div className="story-banner-title">Story mode</div>
        <div className="story-banner-step">{label}</div>
      </div>
      <div className="story-banner-actions">
        <span className="story-banner-count">
          {Math.min(step + 1, total)}/{total}
        </span>
        <button className="ghost-button" type="button" onClick={onRestart}>
          Restart
        </button>
        <button className="primary-button" type="button" onClick={onStop}>
          Stop
        </button>
      </div>
      <div className="story-banner-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
