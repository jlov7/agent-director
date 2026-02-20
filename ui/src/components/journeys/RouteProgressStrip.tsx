type RouteProgressStripProps = {
  routeLabel: string;
  completed: number;
  total: number;
  lastCompletedAction: { id: string; label: string; at: string } | null;
};

export default function RouteProgressStrip({ routeLabel, completed, total, lastCompletedAction }: RouteProgressStripProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="route-progress-strip" aria-label="Route progress">
      <h3>Route progress</h3>
      <div className="route-progress-header">
        <strong>{routeLabel} progress</strong>
        <span>{completed} of {total} complete</span>
      </div>
      <div
        className="route-progress-bar"
        role="progressbar"
        aria-label={`${routeLabel} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span className="route-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {lastCompletedAction ? (
        <p className="route-progress-resume">Resume here: {lastCompletedAction.label}</p>
      ) : null}
    </section>
  );
}
