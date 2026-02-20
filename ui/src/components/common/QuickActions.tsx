type Mode = 'cinema' | 'flow' | 'compare';

type QuickActionsProps = {
  mode: Mode;
  isPlaying: boolean;
  storyActive: boolean;
  hideOnboardingActions?: boolean;
  hidden?: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onTogglePlay: () => void;
  onStartStory: () => void;
  onStopStory: () => void;
  onShowShortcuts: () => void;
  onJumpToBottleneck: () => void;
};

export default function QuickActions({
  mode,
  isPlaying,
  storyActive,
  hideOnboardingActions = false,
  hidden = false,
  open,
  onToggleOpen,
  onTogglePlay,
  onStartStory,
  onStopStory,
  onShowShortcuts,
  onJumpToBottleneck,
}: QuickActionsProps) {
  if (hidden) return null;
  const playLabel = isPlaying ? 'Pause' : 'Play';
  const storyLabel = storyActive ? 'Stop story' : 'Story mode';
  const contextualActions = [
    {
      id: 'playback',
      label: playLabel,
      meta: mode === 'flow' ? 'Cinema' : 'Space',
      active: isPlaying,
      onClick: onTogglePlay,
      helpTitle: 'Play or pause',
      helpBody: 'Start or stop playback from anywhere.',
    },
    {
      id: 'bottleneck',
      label: 'Focus bottleneck',
      meta: 'Latency',
      active: false,
      onClick: onJumpToBottleneck,
      helpTitle: 'Bottleneck jump',
      helpBody: 'Focus instantly on the slowest step.',
    },
    {
      id: 'story',
      label: storyLabel,
      meta: 'Narrate',
      active: storyActive,
      onClick: storyActive ? onStopStory : onStartStory,
      helpTitle: 'Story mode',
      helpBody: 'Auto-runs a cinematic walkthrough of the run.',
      hidden: hideOnboardingActions,
    },
    {
      id: 'shortcuts',
      label: 'Shortcuts',
      meta: '?',
      active: false,
      onClick: onShowShortcuts,
      helpTitle: 'Shortcuts',
      helpBody: 'See the full keyboard map.',
    },
  ]
    .filter((action) => !action.hidden)
    .slice(0, 4);

  if (!open) {
    return (
      <button
        className="quick-actions-toggle"
        type="button"
        onClick={onToggleOpen}
        title="Open quick actions"
        aria-expanded="false"
        data-help
        data-tour="quick-actions"
        data-help-title="Quick actions"
        data-help-body="Open the dock to access contextual tasks for the current workflow."
        data-help-placement="left"
      >
        <span className="quick-actions-toggle-label">Actions</span>
        <span className="quick-actions-toggle-meta">Dock</span>
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
          <div className="quick-actions-subtitle">Contextual tasks (max 4).</div>
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
      {contextualActions.map((action) => (
        <button
          key={action.id}
          className={`quick-action ${action.active ? 'active' : ''}`}
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          data-help
          data-help-title={action.helpTitle}
          data-help-body={action.helpBody}
          data-help-placement="left"
        >
          <span className="quick-action-label">{action.label}</span>
          <span className="quick-action-meta">{action.meta}</span>
        </button>
      ))}
    </aside>
  );
}
