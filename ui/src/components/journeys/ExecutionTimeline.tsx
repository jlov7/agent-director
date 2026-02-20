export type RouteTimelineItem = {
  id: string;
  source: 'async' | 'export';
  label: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'canceled';
  detail: string;
  updatedAt: number;
  retryable: boolean;
  resumable: boolean;
};

type ExecutionTimelineProps = {
  items: RouteTimelineItem[];
  onRetryAsyncAction: (id: string) => void;
  onResumeAsyncAction: (id: string) => void;
  onRetryExportTask: (id: string) => void;
};

export default function ExecutionTimeline({
  items,
  onRetryAsyncAction,
  onResumeAsyncAction,
  onRetryExportTask,
}: ExecutionTimelineProps) {
  if (items.length === 0) {
    return (
      <article className="workspace-card">
        <h3>Execution timeline</h3>
        <p>No async or export actions yet.</p>
      </article>
    );
  }

  return (
    <article className="workspace-card">
      <h3>Execution timeline</h3>
      <div className="route-execution-timeline">
        {items.map((item) => (
          <div key={item.id} className={`route-execution-item status-${item.status}`}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
            <div className="route-execution-meta">
              <span className={`status-badge status-source-${item.source}`}>{item.source}</span>
              <span>{new Date(item.updatedAt).toLocaleTimeString()}</span>
            </div>
            <div className="route-execution-actions">
              {item.retryable ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => (item.source === 'async' ? onRetryAsyncAction(item.id) : onRetryExportTask(item.id))}
                >
                  Retry
                </button>
              ) : null}
              {item.resumable ? (
                <button className="ghost-button" type="button" onClick={() => onResumeAsyncAction(item.id)}>
                  Resume
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
