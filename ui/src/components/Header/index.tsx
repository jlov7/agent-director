import type { TraceSummary } from '../../types';
import LogoMark from '../common/LogoMark';

const buildDate = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '';
const hideBuildDate = import.meta.env.VITE_HIDE_BUILD_DATE === '1';

type HeaderProps = {
  trace: TraceSummary | null;
  traces?: TraceSummary[];
  selectedTraceId?: string | null;
  onSelectTrace?: (traceId: string) => void;
  onReload?: () => void;
  onStartTour?: () => void;
  onToggleStory?: () => void;
  onOpenPalette?: () => void;
  onToggleExplain?: () => void;
  onShareSession?: () => void;
  onThemeChange?: (theme: 'studio' | 'focus' | 'contrast') => void;
  themeMode?: 'studio' | 'focus' | 'contrast';
  motionMode?: 'cinematic' | 'balanced' | 'minimal';
  activeSessions?: number;
  shareStatus?: string | null;
  handoffStatus?: string | null;
  explainMode?: boolean;
  storyActive?: boolean;
  mode?: 'cinema' | 'flow' | 'compare' | 'matrix' | 'gameplay';
  missionCompletion?: { done: number; total: number; pct: number };
  runHealthScore?: number;
  modeHotkeys?: string;
  onMotionChange?: (mode: 'cinematic' | 'balanced' | 'minimal') => void;
  onCreateHandoffDigest?: () => void;
  onOpenSupport?: () => void;
  workspaces?: Array<{ id: string; label: string }>;
  workspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
  workspaceRole?: 'viewer' | 'operator' | 'admin';
  onWorkspaceRoleChange?: (role: 'viewer' | 'operator' | 'admin') => void;
  sessionLabel?: string;
  sessionExpired?: boolean;
  onRenewSession?: () => void;
};

export default function Header({
  trace,
  traces = [],
  selectedTraceId,
  onSelectTrace,
  onReload,
  onStartTour,
  onToggleStory,
  onOpenPalette,
  onToggleExplain,
  onShareSession,
  onThemeChange,
  onMotionChange,
  themeMode = 'studio',
  motionMode = 'balanced',
  activeSessions = 1,
  shareStatus = null,
  handoffStatus = null,
  explainMode = false,
  storyActive = false,
  mode = 'cinema',
  missionCompletion,
  runHealthScore = 100,
  modeHotkeys = 'C / F / Space',
  onCreateHandoffDigest,
  onOpenSupport,
  workspaces = [],
  workspaceId,
  onWorkspaceChange,
  workspaceRole = 'operator',
  onWorkspaceRoleChange,
  sessionLabel = 'Active',
  sessionExpired = false,
  onRenewSession,
}: HeaderProps) {
  const clampedHealth = Math.max(0, Math.min(100, Math.round(runHealthScore)));
  const missionLabel = missionCompletion
    ? `${missionCompletion.done}/${missionCompletion.total} missions`
    : 'Missions n/a';

  return (
    <header
      className="header"
      data-help
      data-help-indicator
      data-tour="header"
      data-help-title="Mission control"
      data-help-body="Trace identity, status, and live controls live here. Use Story, Guide, or Explain to orient new viewers."
      data-help-placement="bottom"
    >
      <div className="header-title">
        <div className="header-logo">
          <LogoMark />
          <span>Agent Director</span>
        </div>
        <div className="header-tagline">Cinematic trace intelligence for agent runs.</div>
        <div className="header-meta">
          <span className="header-run">Run: {trace?.id ?? 'loading'}</span>
          {traces.length > 0 ? (
            <select
              className="trace-select"
              value={selectedTraceId ?? trace?.id ?? ''}
              aria-label="Select trace"
              onChange={(event) => onSelectTrace?.(event.target.value)}
              data-help
              data-help-title="Trace selector"
              data-help-body="Switch between available runs to compare different sessions."
              data-help-placement="bottom"
            >
              {traces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.id})
                </option>
              ))}
            </select>
          ) : null}
          <span className={`status-pill status-${trace?.status ?? 'loading'}`}>
            {trace?.status ?? 'loading'}
          </span>
          {trace?.replay ? (
            <span className="header-replay" title={`Replay from ${trace.branchPointStepId ?? 'unknown step'}`}>
              Replay: {trace.replay.strategy}
            </span>
          ) : null}
          <span className="header-wall">
            Wall: {trace?.metadata.wallTimeMs ?? 0}ms
          </span>
          <span className="header-presence" aria-label="Active sessions">
            Live: {activeSessions}
          </span>
          <span className="header-mode-pill" aria-label="Current mode">
            Mode: {mode}
          </span>
          {workspaceId ? (
            <span className="header-workspace-pill" aria-label="Current workspace">
              Workspace: {workspaceId}
            </span>
          ) : null}
          <span className={`header-role-pill role-${workspaceRole}`} aria-label="Current workspace role">
            Role: {workspaceRole}
          </span>
          <span className={`header-session-pill ${sessionExpired ? 'expired' : ''}`} aria-label="Session status">
            Session: {sessionLabel}
          </span>
          <span className="header-hotkeys" aria-label="Mode hotkeys">
            Keys: {modeHotkeys}
          </span>
          <span className="header-mission" aria-label="Mission completion">
            {missionLabel}
          </span>
          <span className="header-health" aria-label={`Run health score ${clampedHealth}`}>
            <span className="header-health-bar">
              <span className="header-health-fill" style={{ width: `${clampedHealth}%` }} />
            </span>
            <span>Health {clampedHealth}</span>
          </span>
          {shareStatus ? <span className="header-share-status">{shareStatus}</span> : null}
          {handoffStatus ? <span className="header-share-status">{handoffStatus}</span> : null}
        </div>
      </div>
      <div className="header-actions">
        <label className="theme-picker">
          Workspace
          <select
            className="trace-select"
            value={workspaceId}
            aria-label="Select workspace"
            onChange={(event) => onWorkspaceChange?.(event.target.value)}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.label}
              </option>
            ))}
          </select>
        </label>
        <label className="theme-picker">
          Role
          <select
            className="trace-select"
            value={workspaceRole}
            aria-label="Select workspace role"
            onChange={(event) =>
              onWorkspaceRoleChange?.(event.target.value as 'viewer' | 'operator' | 'admin')
            }
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="theme-picker">
          Theme
          <select
            className="trace-select"
            value={themeMode}
            aria-label="Select theme"
            onChange={(event) =>
              onThemeChange?.(event.target.value as 'studio' | 'focus' | 'contrast')
            }
          >
            <option value="studio">Studio</option>
            <option value="focus">Focus</option>
            <option value="contrast">Contrast</option>
          </select>
        </label>
        <label className="theme-picker">
          Motion
          <select
            className="trace-select"
            value={motionMode}
            aria-label="Select motion profile"
            onChange={(event) =>
              onMotionChange?.(event.target.value as 'cinematic' | 'balanced' | 'minimal')
            }
          >
            <option value="cinematic">Cinematic</option>
            <option value="balanced">Balanced</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
        <button
          className={`ghost-button ${storyActive ? 'active' : ''}`}
          type="button"
          onClick={onToggleStory}
          aria-pressed={storyActive}
          aria-label="Toggle story mode"
          data-help
          data-help-title="Story mode"
          data-help-body="Auto-runs a cinematic walkthrough for demos."
          data-help-placement="bottom"
        >
          Story
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={onStartTour}
          aria-label="Start guided tour"
          data-help
          data-help-title="Guided tour"
          data-help-body="Walk through the interface step by step."
          data-help-placement="bottom"
        >
          Guide
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          data-help
          data-help-title="Command palette"
          data-help-body="Search and trigger any action instantly."
          data-help-placement="bottom"
        >
          Command
        </button>
        <button
          className={`ghost-button ${explainMode ? 'active' : ''}`}
          type="button"
          onClick={onToggleExplain}
          aria-pressed={explainMode}
          aria-label="Toggle explain mode"
          data-help
          data-help-title="Explain mode"
          data-help-body="Hover any control to see contextual guidance."
          data-help-placement="bottom"
        >
          Explain
        </button>
        <button
          className="ghost-button"
          onClick={onReload}
          type="button"
          aria-label="Refresh traces"
          title="Refresh traces"
          data-help
          data-help-title="Refresh"
          data-help-body="Reload traces from the data store."
          data-help-placement="bottom"
        >
          Refresh
        </button>
        <button
          className={`ghost-button ${sessionExpired ? 'warn' : ''}`}
          type="button"
          onClick={onRenewSession}
          aria-label="Renew workspace session"
          title="Renew workspace session"
        >
          Renew Session
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={onShareSession}
          aria-label="Copy live session link"
          title="Copy live session link"
        >
          Share
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={onCreateHandoffDigest}
          aria-label="Copy session handoff digest"
          title="Copy session handoff digest"
        >
          Handoff
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={onOpenSupport}
          aria-label="Open support diagnostics"
          title="Open support diagnostics"
        >
          Support
        </button>
        <a
          className="ghost-button"
          href="/help.html"
          target="_blank"
          rel="noreferrer"
          data-help
          data-help-title="Help"
          data-help-body="Open quick docs for first run, key flows, troubleshooting, and shortcuts."
          data-help-placement="bottom"
        >
          Help
        </a>
        {!hideBuildDate ? <span className="header-build">Build: {buildDate.slice(0, 19)}</span> : null}
      </div>
    </header>
  );
}
