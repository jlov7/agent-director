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
};

export default function Header({ trace, traces = [], selectedTraceId, onSelectTrace, onReload }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-title">
        <div className="header-logo">
          <LogoMark />
          <span>Agent Director</span>
        </div>
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
        <button className="ghost-button" onClick={onReload} type="button" aria-label="Refresh traces" title="Refresh traces">
          Refresh
        </button>
        {!hideBuildDate ? <span className="header-build">Build: {buildDate.slice(0, 19)}</span> : null}
      </div>
    </header>
  );
}
