type Mode = 'cinema' | 'flow' | 'compare';

type QuickActionsProps = {
  mode: Mode;
  isPlaying: boolean;
  storyActive: boolean;
  explainMode: boolean;
  hidden?: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onTogglePlay: () => void;
  onStartStory: () => void;
  onStopStory: () => void;
  onStartTour: () => void;
  onOpenPalette: () => void;
  onShowShortcuts: () => void;
  onToggleExplain: () => void;
  onJumpToBottleneck: () => void;
};

export default function QuickActions({
  mode,
  isPlaying,
  storyActive,
  explainMode,
  hidden = false,
  open,
  onToggleOpen,
  onTogglePlay,
  onStartStory,
  onStopStory,
  onStartTour,
  onOpenPalette,
  onShowShortcuts,
  onToggleExplain,
  onJumpToBottleneck,
}: QuickActionsProps) {
  if (hidden) return null;
  const playLabel = isPlaying ? 'Pause' : 'Play';
  const storyLabel = storyActive ? 'Stop story' : 'Story mode';

  if (!open) {
    return (
      <button
        className="quick-actions-toggle"
        type="button"
        onClick={onToggleOpen}
        aria-label="Open quick actions"
        aria-expanded="false"
        data-help
        data-tour="quick-actions"
        data-help-title="Quick actions"
        data-help-body="Open the dock to access demos, shortcuts, and instant actions."
        data-help-placement="left"
      >
        Dock
      </button>
    );
  }

  return (
    <aside
      className="quick-actions"
      aria-label="Quick actions"
      data-help
      data-help-indicator
      data-tour="quick-actions"
      data-help-title="Quick actions"
      data-help-body="Launch story mode, open the command palette, or jump to the bottleneck instantly."
      data-help-placement="left"
    >
      <div className="quick-actions-header">
        <div>
          <div className="quick-actions-title">Quick actions</div>
          <div className="quick-actions-subtitle">Pin demo controls close at hand.</div>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={onToggleOpen}
          aria-label="Collapse quick actions"
        >
          Collapse
        </button>
      </div>
      <button
        className={`quick-action ${isPlaying ? 'active' : ''}`}
        type="button"
        onClick={onTogglePlay}
        aria-label={playLabel}
        data-help
        data-help-title="Play or pause"
        data-help-body="Start or stop playback from anywhere."
        data-help-placement="left"
      >
        <span className="quick-action-label">{playLabel}</span>
        <span className="quick-action-meta">{mode === 'flow' ? 'Cinema' : 'Space'}</span>
      </button>
      <button
        className={`quick-action ${storyActive ? 'active' : ''}`}
        type="button"
        onClick={storyActive ? onStopStory : onStartStory}
        aria-label={storyLabel}
        data-help
        data-help-title="Story mode"
        data-help-body="Auto-runs a cinematic walkthrough of the run."
        data-help-placement="left"
      >
        <span className="quick-action-label">{storyLabel}</span>
        <span className="quick-action-meta">S</span>
      </button>
      <button
        className="quick-action"
        type="button"
        onClick={onOpenPalette}
        aria-label="Open command palette"
        data-help
        data-help-title="Command palette"
        data-help-body="Search every action and jump instantly."
        data-help-placement="left"
      >
        <span className="quick-action-label">Command</span>
        <span className="quick-action-meta">Cmd+K</span>
      </button>
      <button
        className="quick-action"
        type="button"
        onClick={onStartTour}
        aria-label="Start guided tour"
        data-help
        data-help-title="Guided tour"
        data-help-body="Walk the interface with a curated tour."
        data-help-placement="left"
      >
        <span className="quick-action-label">Tour</span>
        <span className="quick-action-meta">Guide</span>
      </button>
      <button
        className={`quick-action ${explainMode ? 'active' : ''}`}
        type="button"
        onClick={onToggleExplain}
        aria-label="Toggle explain mode"
        data-help
        data-help-title="Explain mode"
        data-help-body="Toggle contextual overlays for every control."
        data-help-placement="left"
      >
        <span className="quick-action-label">Explain</span>
        <span className="quick-action-meta">{explainMode ? 'On' : 'Off'}</span>
      </button>
      <button
        className="quick-action"
        type="button"
        onClick={onJumpToBottleneck}
        aria-label="Jump to bottleneck"
        data-help
        data-help-title="Bottleneck jump"
        data-help-body="Focus instantly on the slowest step."
        data-help-placement="left"
      >
        <span className="quick-action-label">Bottleneck</span>
        <span className="quick-action-meta">Latency</span>
      </button>
      <button
        className="quick-action"
        type="button"
        onClick={onShowShortcuts}
        aria-label="Show shortcuts"
        data-help
        data-help-title="Shortcuts"
        data-help-body="See the full keyboard map."
        data-help-placement="left"
      >
        <span className="quick-action-label">Shortcuts</span>
        <span className="quick-action-meta">?</span>
      </button>
    </aside>
  );
}
