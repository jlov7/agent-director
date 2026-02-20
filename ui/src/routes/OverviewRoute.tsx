import JourneyActionCard from '../components/journeys/JourneyActionCard';
import type { WorkspaceRouteStatus } from './workspaceRouteTypes';

type OverviewRouteProps = {
  status: WorkspaceRouteStatus;
  runHealthScore: number;
  lastCompletedActionId: string | null;
  onRouteAction: (actionId: string) => void;
};

export default function OverviewRoute({ status, runHealthScore, lastCompletedActionId, onRouteAction }: OverviewRouteProps) {
  const resumeAction = lastCompletedActionId;
  const clampedHealth = Math.max(0, Math.min(100, Math.round(runHealthScore)));

  return (
    <div className="workspace-context-grid route-context-grid" data-route-panel="overview">
      <article className="workspace-card route-state-card">
        <h3>Overview state</h3>
        {status === null ? (
          <>
            <p>No run loaded yet. Start with run health, then inspect top risk.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('overview-review-health')}>
                Review run health
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('overview-inspect-risk')}>
                Inspect top risk
              </button>
            </div>
          </>
        ) : null}
        {status === 'failed' ? (
          <>
            <p>Current run failed. Recover with risk inspection and immediate handoff.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('overview-inspect-risk')}>
                Inspect top risk
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('overview-share-handoff')}>
                Share handoff digest
              </button>
            </div>
          </>
        ) : null}
        {status === 'completed' ? (
          <>
            <p>Run completed. Confirm health and share a concise handoff.</p>
            <p className="route-state-summary">What changed: run health stabilized at {clampedHealth}/100 with final completion status.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('overview-share-handoff')}>
                Share handoff digest
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('overview-inspect-risk')}>
                Re-check top risk
              </button>
            </div>
          </>
        ) : null}
        {status === 'running' ? (
          <>
            <p>Run is active. Keep an eye on health and top-risk movement.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('overview-review-health')}>
                Review run health
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('overview-inspect-risk')}>
                Inspect top risk
              </button>
            </div>
          </>
        ) : null}
        <p>Health score: <strong>{clampedHealth}</strong></p>
      </article>

      <JourneyActionCard
        title="Review run health"
        outcome="Confirm current run stability and risk posture."
        why="A clear health read prevents reactive context switching."
        ctaLabel="Review run health"
        onCta={() => onRouteAction('overview-review-health')}
        resume={resumeAction === 'overview-review-health'}
        tone={runHealthScore >= 80 ? 'success' : 'warning'}
      />
      <JourneyActionCard
        title="Inspect top risk"
        outcome="Open the highest-risk step and verify impact scope."
        why="Fast risk inspection shortens time to triage decision."
        ctaLabel="Inspect top risk"
        onCta={() => onRouteAction('overview-inspect-risk')}
        resume={resumeAction === 'overview-inspect-risk'}
      />
      <JourneyActionCard
        title="Share handoff digest"
        outcome="Publish what changed, why, and recommended next move."
        why="Stakeholders need one clear status update, not a raw trace."
        ctaLabel="Share handoff digest"
        onCta={() => onRouteAction('overview-share-handoff')}
        resume={resumeAction === 'overview-share-handoff'}
      />
    </div>
  );
}
