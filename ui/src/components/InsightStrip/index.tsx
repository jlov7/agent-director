import type { TraceInsights } from '../../types';

type InsightStripProps = {
  insights: TraceInsights | null;
  onSelectStep?: (stepId: string) => void;
  onJumpToBottleneck?: () => void;
  onJumpToError?: () => void;
};

export default function InsightStrip({ insights, onSelectStep, onJumpToBottleneck, onJumpToError }: InsightStripProps) {
  if (!insights) return null;
  const timing = insights.timing;
  const ioWarnings = insights.ioWarnings ?? [];
  const concurrency = insights.concurrency;
  const retryPatterns = insights.retryPatterns;
  const costByTool = insights.costByTool ?? {};
  const costByModel = insights.costByModel ?? {};

  return (
    <section
      className="insight-strip"
      data-help
      data-tour="insights"
      data-help-title="Run insights"
      data-help-body="Fast diagnostics for latency, cost, errors, and concurrency. Click chips to jump into the trace."
      data-help-placement="bottom"
    >
      <div className="insight-block">
        <span className="insight-label">Top latency</span>
        <div className="insight-items">
          {insights.topLatencySteps.map((step) => (
            <button
              key={step.stepId}
              className="insight-chip"
              type="button"
              title={`Jump to ${step.name}`}
              onClick={() => onSelectStep?.(step.stepId)}
            >
              {step.name} ({step.durationMs}ms)
            </button>
          ))}
          {insights.topLatencySteps.length > 0 ? (
            <button className="insight-chip" type="button" onClick={onJumpToBottleneck} title="Jump to longest step">
              Jump to bottleneck
            </button>
          ) : null}
        </div>
      </div>
      <div className="insight-block">
        <span className="insight-label">Cost by type</span>
        <div className="insight-items">
          {Object.entries(insights.costByType).map(([type, cost]) => (
            <span key={type} className="insight-chip" title={`Total cost for ${type}`}>
              {type}: ${cost.toFixed(3)}
            </span>
          ))}
        </div>
      </div>
      {Object.keys(costByTool).length ? (
        <div className="insight-block">
          <span className="insight-label">Cost by tool</span>
          <div className="insight-items">
            {Object.entries(costByTool)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([tool, cost]) => (
                <span key={tool} className="insight-chip" title={`Total cost for ${tool}`}>
                  {tool}: ${cost.toFixed(3)}
                </span>
              ))}
          </div>
        </div>
      ) : null}
      <div className="insight-block">
        <span className="insight-label">Errors / retries</span>
        <div className="insight-items">
          <span className="insight-chip">Errors: {insights.errors}</span>
          <span className="insight-chip">Retries: {insights.retries}</span>
          {insights.errors > 0 ? (
            <button className="insight-chip" type="button" onClick={onJumpToError} title="Jump to first error">
              Jump to first error
            </button>
          ) : null}
          {retryPatterns?.topRetries?.length ? (
            <span
              className="insight-chip"
              title={`Retry rate ${(retryPatterns.retryRate * 100).toFixed(1)}%`}
            >
              Top retries: {retryPatterns.topRetries.length}
            </span>
          ) : null}
        </div>
      </div>
      <div className="insight-block">
        <span className="insight-label">Wall vs work</span>
        <div className="insight-items">
          <span className="insight-chip" title="Wall clock duration">
            Wall: {insights.wallTimeMs}ms
          </span>
          <span className="insight-chip" title="Sum of step durations">
            Work: {insights.workTimeMs}ms
          </span>
          {insights.criticalPathMs != null ? (
            <span className="insight-chip" title="Longest parent-child chain">
              Critical: {insights.criticalPathMs}ms
            </span>
          ) : null}
        </div>
      </div>
      <div className="insight-block">
        <span className="insight-label">Health</span>
        <div className="insight-items">
          {timing?.degraded ? (
            <span className="insight-chip insight-warning" title={timing.issues.join(' ')}>
              Timing degraded
            </span>
          ) : (
            <span className="insight-chip">Timing OK</span>
          )}
          {ioWarnings.length > 0 ? (
            <span className="insight-chip insight-warning" title={ioWarnings.map((w) => w.message).join(' ')}>
              IO warnings: {ioWarnings.length}
            </span>
          ) : (
            <span className="insight-chip">IO OK</span>
          )}
        </div>
      </div>
      {concurrency?.buckets?.length ? (
        <div className="insight-block">
          <span className="insight-label">Parallelism</span>
          <div className="insight-items">
            <div className="insight-heatmap" title={`Peak concurrency: ${concurrency.peak}`}>
              {concurrency.buckets.map((bucket, index) => (
                <span
                  key={`${bucket.startMs}-${bucket.endMs}`}
                  className="heatmap-bar"
                  style={{ height: `${Math.max(20, (bucket.active / Math.max(1, concurrency.peak)) * 48)}px` }}
                  title={`Bucket ${index + 1}: ${bucket.active} active`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {Object.keys(costByModel).length ? (
        <div className="insight-block">
          <span className="insight-label">Model cost</span>
          <div className="insight-items">
            {Object.entries(costByModel).map(([model, cost]) => (
              <span key={model} className="insight-chip" title={`Total cost for ${model}`}>
                {model}: ${cost.toFixed(3)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
