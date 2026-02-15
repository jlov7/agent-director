import type { InvestigationReport, TraceInsights } from '../../types';

type InsightStripProps = {
  insights: TraceInsights | null;
  investigation?: InvestigationReport | null;
  onSelectStep?: (stepId: string) => void;
  onJumpToBottleneck?: () => void;
  onJumpToError?: () => void;
};

export default function InsightStrip({
  insights,
  investigation,
  onSelectStep,
  onJumpToBottleneck,
  onJumpToError,
}: InsightStripProps) {
  if (!insights) return null;
  const timing = insights.timing;
  const ioWarnings = insights.ioWarnings ?? [];
  const concurrency = insights.concurrency;
  const retryPatterns = insights.retryPatterns;
  const costByTool = insights.costByTool ?? {};
  const costByModel = insights.costByModel ?? {};
  const topHypotheses = investigation?.hypotheses?.slice(0, 2) ?? [];

  return (
    <section
      className="insight-strip"
      data-help
      data-help-indicator
      data-tour="insights"
      data-help-title="Run insights"
      data-help-body="Fast diagnostics for latency, cost, errors, and concurrency. Click chips to jump into the trace."
      data-help-placement="bottom"
    >
      <div
        className="insight-block"
        data-help
        data-help-title="Top latency"
        data-help-body="Largest steps by duration; jump straight to the slowest."
        data-help-placement="bottom"
      >
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
      <div
        className="insight-block"
        data-help
        data-help-title="Cost by type"
        data-help-body="Aggregated spend by step class."
        data-help-placement="bottom"
      >
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
        <div
          className="insight-block"
          data-help
          data-help-title="Cost by tool"
          data-help-body="Top tools by total spend."
          data-help-placement="bottom"
        >
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
      <div
        className="insight-block"
        data-help
        data-help-title="Errors & retries"
        data-help-body="Instant visibility into failed or retried steps."
        data-help-placement="bottom"
      >
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
      <div
        className="insight-block"
        data-help
        data-help-title="Wall vs work"
        data-help-body="Wall time vs summed work to show parallelism."
        data-help-placement="bottom"
      >
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
      <div
        className="insight-block"
        data-help
        data-help-title="Health"
        data-help-body="Timing and I/O anomalies detected in the trace."
        data-help-placement="bottom"
      >
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
      {topHypotheses.length ? (
        <div
          className="insight-block"
          data-help
          data-help-title="Investigator"
          data-help-body="Automated root-cause hypotheses ranked by severity and confidence."
          data-help-placement="bottom"
        >
          <span className="insight-label">Investigator</span>
          <div className="insight-items">
            {topHypotheses.map((hypothesis) => (
              <span key={hypothesis.id} className="insight-chip" title={hypothesis.summary}>
                {hypothesis.title} ({Math.round(hypothesis.confidence * 100)}%)
              </span>
            ))}
            {topHypotheses[0]?.evidenceStepIds?.[0] ? (
              <button
                className="insight-chip"
                type="button"
                onClick={() => onSelectStep?.(topHypotheses[0].evidenceStepIds[0])}
              >
                Jump to evidence
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {concurrency?.buckets?.length ? (
        <div
          className="insight-block"
          data-help
          data-help-title="Parallelism"
          data-help-body="How many steps ran concurrently over time."
          data-help-placement="bottom"
        >
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
        <div
          className="insight-block"
          data-help
          data-help-title="Model cost"
          data-help-body="Spend by model family."
          data-help-placement="bottom"
        >
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
