import { useMemo, useState } from 'react';
import JourneyActionCard from '../components/journeys/JourneyActionCard';
import type { RouteActionHistoryEntry, RouteSnapshot, WorkspaceRouteStatus } from './workspaceRouteTypes';

type CoordinateRouteProps = {
  status: WorkspaceRouteStatus;
  runOwner: string;
  handoffOwner: string;
  snapshots: RouteSnapshot[];
  activityFeed: Array<{ id: string; message: string; timestamp: number }>;
  actionHistory: RouteActionHistoryEntry[];
  lastCompletedActionId: string | null;
  onRunOwnerChange: (value: string) => void;
  onHandoffOwnerChange: (value: string) => void;
  onRouteAction: (actionId: string) => void;
};

export default function CoordinateRoute({
  status,
  runOwner,
  handoffOwner,
  snapshots,
  activityFeed,
  actionHistory,
  lastCompletedActionId,
  onRunOwnerChange,
  onHandoffOwnerChange,
  onRouteAction,
}: CoordinateRouteProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const mergedHistory = useMemo(
    () =>
      [
        ...actionHistory.map((entry) => ({
          id: `route-${entry.id}`,
          at: entry.at,
          message: entry.label,
          source: 'route' as const,
        })),
        ...activityFeed.map((entry) => ({
          id: `collab-${entry.id}`,
          at: new Date(entry.timestamp).toISOString(),
          message: entry.message,
          source: 'collaboration' as const,
        })),
      ]
        .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
        .slice(0, 10),
    [actionHistory, activityFeed]
  );

  return (
    <div className="workspace-context-grid route-context-grid" data-route-panel="coordinate">
      <article className="workspace-card route-state-card route-focal-card">
        <h3>Coordinate state</h3>
        {status === null ? (
          <>
            <p>No run context loaded yet. Set owners and share live context before action starts.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('coordinate-share-live')}>
                Share live context
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('coordinate-copy-handoff')}>
                Copy handoff digest
              </button>
            </div>
          </>
        ) : null}
        {status === 'loading' ? (
          <>
            <p>Coordination context is loading. Confirm owners first so handoff continuity is preserved.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('coordinate-share-live')}>
                Share live context
              </button>
            </div>
          </>
        ) : null}
        {status === 'failed' ? (
          <>
            <p>Run is in failure state. Keep ownership aligned and preserve exact handoff evidence.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('coordinate-copy-handoff')}>
                Copy handoff digest
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('coordinate-capture-snapshot')}>
                Capture handoff snapshot
              </button>
            </div>
          </>
        ) : null}
        {status === 'completed' ? (
          <>
            <p>Coordination complete. Confirm ownership and preserve final handoff context.</p>
            <p className="route-state-summary">What changed: run ownership, handoff summary, and route snapshot trail are aligned.</p>
            <div className="route-state-actions">
              <button className="primary-button" type="button" onClick={() => onRouteAction('coordinate-capture-snapshot')}>
                Capture handoff snapshot
              </button>
              <button className="ghost-button" type="button" onClick={() => onRouteAction('coordinate-copy-handoff')}>
                Copy handoff digest
              </button>
            </div>
          </>
        ) : null}
        {status === 'running' ? (
          <>
            <p>Run is active. Keep ownership current and checkpoint snapshots as context evolves.</p>
            <p className="route-state-summary">Keyboard hint: use keys 1-3 to share, copy handoff, and capture snapshot.</p>
          </>
        ) : null}
      </article>

      <article className="workspace-card">
        <h3>Ownership and handoff</h3>
        <div className="workspace-inline-form">
          <input
            className="search-input"
            value={runOwner}
            onChange={(event) => onRunOwnerChange(event.target.value)}
            aria-label="Run owner"
            placeholder="Run owner"
          />
          <input
            className="search-input"
            value={handoffOwner}
            onChange={(event) => onHandoffOwnerChange(event.target.value)}
            aria-label="Handoff owner"
            placeholder="Handoff owner"
          />
        </div>
      </article>

      <JourneyActionCard
        title="Share live context"
        outcome="Generate a live collaboration link for responders."
        why="Live links align responders on one source of truth."
        ctaLabel="Share live context"
        onCta={() => onRouteAction('coordinate-share-live')}
        resume={lastCompletedActionId === 'coordinate-share-live'}
      />
      <JourneyActionCard
        title="Copy handoff digest"
        outcome="Publish concise ownership and decision summary."
        why="Digest handoffs reduce repeated clarifications."
        ctaLabel="Copy handoff digest"
        onCta={() => onRouteAction('coordinate-copy-handoff')}
        resume={lastCompletedActionId === 'coordinate-copy-handoff'}
      />
      <JourneyActionCard
        title="Capture handoff snapshot"
        outcome="Freeze route state as handoff-ready checkpoint."
        why="Snapshots preserve exact decision context for async teams."
        ctaLabel="Capture snapshot"
        onCta={() => onRouteAction('coordinate-capture-snapshot')}
        resume={lastCompletedActionId === 'coordinate-capture-snapshot'}
      />

      <article className="workspace-card">
        <h3>Coordination history</h3>
        <p>Open detailed route and collaboration history only when you need deeper context.</p>
        <div className="route-state-actions">
          <button className="ghost-button" type="button" onClick={() => setHistoryOpen((prev) => !prev)}>
            {historyOpen ? 'Hide history details' : 'Show history details'}
          </button>
        </div>
      </article>

      <article className="workspace-card">
        <h3>Handoff snapshots</h3>
        {snapshots.length === 0 ? <p>No snapshots yet. Capture one before handoff.</p> : null}
        <div className="workspace-feed">
          {snapshots.slice(0, 6).map((snapshot) => (
            <div key={snapshot.id} className="workspace-feed-item">
              <span>{new Date(snapshot.at).toLocaleTimeString()}</span>
              <span>{snapshot.summary}</span>
            </div>
          ))}
        </div>
      </article>

      {historyOpen ? (
        <article className="workspace-card route-education-card">
          <h3>History details</h3>
          {mergedHistory.length === 0 ? <p>No route or collaboration history recorded yet.</p> : null}
          <div className="workspace-feed">
            {mergedHistory.map((entry) => (
              <div key={entry.id} className="workspace-feed-item">
                <span>{new Date(entry.at).toLocaleTimeString()}</span>
                <span>
                  [{entry.source === 'route' ? 'Route' : 'Collab'}] {entry.message}
                </span>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}
