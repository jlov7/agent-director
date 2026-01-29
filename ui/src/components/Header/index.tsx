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
  onToggleExplain?: () => void;
  explainMode?: boolean;
};

export default function Header({
  trace,
  traces = [],
  selectedTraceId,
  onSelectTrace,
  onReload,
  onStartTour,
  onToggleExplain,
  explainMode = false,
}: HeaderProps) {
  return (
    <header
      className="header"
      data-help
      data-tour="header"
      data-help-title="Mission control"
      data-help-body="Trace identity, status, and live controls live here. Use Guide or Explain to orient new viewers."
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
        <button className="ghost-button" type="button" onClick={onStartTour} aria-label="Start guided tour">
          Guide
        </button>
        <button
          className={`ghost-button ${explainMode ? 'active' : ''}`}
          type="button"
          onClick={onToggleExplain}
          aria-pressed={explainMode}
          aria-label="Toggle explain mode"
        >
          Explain
        </button>
        <button className="ghost-button" onClick={onReload} type="button" aria-label="Refresh traces" title="Refresh traces">
          Refresh
        </button>
        {!hideBuildDate ? <span className="header-build">Build: {buildDate.slice(0, 19)}</span> : null}
      </div>
    </header>
  );
}
