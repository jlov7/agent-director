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
  explainMode?: boolean;
  storyActive?: boolean;
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
  explainMode = false,
  storyActive = false,
}: HeaderProps) {
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
        </div>
      </div>
      <div className="header-actions">
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
        {!hideBuildDate ? <span className="header-build">Build: {buildDate.slice(0, 19)}</span> : null}
      </div>
    </header>
  );
}
