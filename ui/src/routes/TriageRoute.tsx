import JourneyActionCard from '../components/journeys/JourneyActionCard';
import type { WorkspaceRouteStatus } from './workspaceRouteTypes';

type TriageRouteProps = {
  status: WorkspaceRouteStatus;
  supportEnabled: boolean;
  lastCompletedActionId: string | null;
  onRouteAction: (actionId: string) => void;
};

export default function TriageRoute({ status, supportEnabled, lastCompletedActionId, onRouteAction }: TriageRouteProps) {
  return (
    <div className="workspace-context-grid route-context-grid" data-route-panel="triage">
      <article className="workspace-card route-state-card">
        <h3>Triage state</h3>
        {status === null ? (
          <>
            <p>No failure signal selected. Start with incident observation and isolate the likely cause.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('triage-observe-incident')}>
                Observe now
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('triage-isolate-cause')}>
                Isolate cause
              </button>
            </div>
          </>
        ) : null}
        {status === 'failed' ? (
          <div className="workspace-inline-form">
            <p>Failure detected. Run recovery in this order: observe, isolate, validate, share.</p>
            <button className="primary-button" type="button" onClick={() => onRouteAction('triage-observe-incident')}>
              Observe now
            </button>
            <button className="ghost-button" type="button" onClick={() => onRouteAction('triage-isolate-cause')}>
              Isolate cause
            </button>
            {supportEnabled ? (
              <button className="ghost-button" type="button" onClick={() => onRouteAction('triage-open-support')}>
                Open support diagnostics
              </button>
            ) : null}
          </div>
        ) : null}
        {status === 'completed' ? (
          <>
            <p>Triage complete. Validate final state and package a clean handoff.</p>
            <p className="route-state-summary">What changed: the active incident path moved from failure to recovered handoff readiness.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('triage-share-handoff')}>
                Share handoff
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('triage-validate-fix')}>
                Re-validate fix
              </button>
            </div>
          </>
        ) : null}
        {status === 'running' ? (
          <p>Use the task sequence below to keep triage deterministic and handoff-ready.</p>
        ) : null}
      </article>

      <JourneyActionCard
        title="Observe the incident"
        outcome="Lock onto the failing or slowest step immediately."
        why="Problem-first ordering prevents wasted analysis loops."
        ctaLabel="Observe incident"
        onCta={() => onRouteAction('triage-observe-incident')}
        resume={lastCompletedActionId === 'triage-observe-incident'}
      />
      <JourneyActionCard
        title="Isolate the cause"
        outcome="Switch to dependency flow and isolate causal path."
        why="Isolation narrows the fix candidate set quickly."
        ctaLabel="Isolate cause"
        onCta={() => onRouteAction('triage-isolate-cause')}
        resume={lastCompletedActionId === 'triage-isolate-cause'}
      />
      <JourneyActionCard
        title="Validate the fix"
        outcome="Run compare or matrix validation before declaring recovery."
        why="Validation catches false positives before handoff."
        ctaLabel="Validate fix"
        onCta={() => onRouteAction('triage-validate-fix')}
        resume={lastCompletedActionId === 'triage-validate-fix'}
      />
      <JourneyActionCard
        title="Share the handoff"
        outcome="Publish the action trail and recommended ownership handoff."
        why="Handoff clarity lowers repeat triage load."
        ctaLabel="Share handoff"
        onCta={() => onRouteAction('triage-share-handoff')}
        resume={lastCompletedActionId === 'triage-share-handoff'}
      />
    </div>
  );
}
