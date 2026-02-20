import { memo, useMemo } from 'react';
import RouteProgressStrip from '../components/journeys/RouteProgressStrip';
import CoordinateRoute from './CoordinateRoute';
import DiagnoseRoute from './DiagnoseRoute';
import OverviewRoute from './OverviewRoute';
import SettingsRoute from './SettingsRoute';
import TriageRoute from './TriageRoute';
import { type UxRebootRoute } from './routeConfig';
import type { WorkspaceRouteProps } from './workspaceRouteTypes';

const ROUTE_OUTCOME_COPY: Record<UxRebootRoute, string> = {
  overview: 'Understand run health, risk, and the next decision in under a minute.',
  triage: 'Resolve urgent failures with a deterministic problem-first workflow.',
  diagnose: 'Produce evidence-backed root-cause findings and validated next actions.',
  coordinate: 'Keep ownership, handoff, and collaboration continuity aligned.',
  settings: 'Configure safe defaults and controls for predictable operation.',
};

const ROUTE_LABEL: Record<UxRebootRoute, string> = {
  overview: 'Overview',
  triage: 'Triage',
  diagnose: 'Diagnose',
  coordinate: 'Coordinate',
  settings: 'Settings',
};

function WorkspaceRoute({
  route,
  status,
  runHealthScore,
  workspaceRole,
  runOwner,
  handoffOwner,
  routeProgress,
  lastCompletedAction,
  actionHistory,
  snapshots,
  activityFeed,
  asyncTimeline,
  themeMode,
  motionMode,
  densityMode,
  appLocale,
  gameplayLocale,
  safeExport,
  gamepadEnabled,
  windowed,
  rolloutCohort,
  featureFlags,
  onRouteAction,
  onRetryAsyncAction,
  onResumeAsyncAction,
  onRetryExportTask,
  onRunOwnerChange,
  onHandoffOwnerChange,
  onThemeModeChange,
  onMotionModeChange,
  onDensityModeChange,
  onAppLocaleChange,
  onGameplayLocaleChange,
  onToggleSafeExport,
  onToggleGamepadEnabled,
  onToggleWindowed,
  onRolloutCohortChange,
  onToggleFeatureFlag,
}: WorkspaceRouteProps) {
  const routeHistory = useMemo(
    () => actionHistory.filter((entry) => entry.route === route),
    [actionHistory, route]
  );
  const routeTitleId = `workspace-route-${route}`;

  return (
    <section className="workspace-route-shell" aria-labelledby={routeTitleId}>
      <h2 id={routeTitleId} className="sr-only">
        {ROUTE_LABEL[route]} route workspace
      </h2>
      <article className="workspace-card route-outcome-card">
        <h3>Route outcome</h3>
        <p>{ROUTE_OUTCOME_COPY[route]}</p>
        <p className="route-outcome-subcopy">Role context: {workspaceRole}. Keep one intent active until complete.</p>
      </article>

      <RouteProgressStrip
        routeLabel={ROUTE_LABEL[route]}
        completed={routeProgress.completed}
        total={routeProgress.total}
        lastCompletedAction={lastCompletedAction}
      />

      {routeHistory.length > 0 ? (
        <article className="workspace-card route-history-strip" aria-label="Route action history">
          <h3>Recent route actions</h3>
          <div className="workspace-feed">
            {routeHistory.slice(0, 6).map((entry) => (
              <div key={entry.id} className="workspace-feed-item">
                <span>{new Date(entry.at).toLocaleTimeString()}</span>
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {route === 'overview' ? (
        <OverviewRoute
          status={status}
          runHealthScore={runHealthScore}
          lastCompletedActionId={lastCompletedAction?.id ?? null}
          onRouteAction={onRouteAction}
        />
      ) : null}

      {route === 'triage' ? (
        <TriageRoute
          status={status}
          supportEnabled={featureFlags.supportPanelV1}
          lastCompletedActionId={lastCompletedAction?.id ?? null}
          onRouteAction={onRouteAction}
        />
      ) : null}

      {route === 'diagnose' ? (
        <DiagnoseRoute
          status={status}
          lastCompletedActionId={lastCompletedAction?.id ?? null}
          timelineItems={asyncTimeline}
          onRouteAction={onRouteAction}
          onRetryAsyncAction={onRetryAsyncAction}
          onResumeAsyncAction={onResumeAsyncAction}
          onRetryExportTask={onRetryExportTask}
        />
      ) : null}

      {route === 'coordinate' ? (
        <CoordinateRoute
          status={status}
          runOwner={runOwner}
          handoffOwner={handoffOwner}
          snapshots={snapshots}
          activityFeed={activityFeed}
          actionHistory={actionHistory}
          lastCompletedActionId={lastCompletedAction?.id ?? null}
          onRunOwnerChange={onRunOwnerChange}
          onHandoffOwnerChange={onHandoffOwnerChange}
          onRouteAction={onRouteAction}
        />
      ) : null}

      {route === 'settings' ? (
        <SettingsRoute
          workspaceRole={workspaceRole}
          themeMode={themeMode}
          motionMode={motionMode}
          densityMode={densityMode}
          appLocale={appLocale}
          gameplayLocale={gameplayLocale}
          safeExport={safeExport}
          gamepadEnabled={gamepadEnabled}
          windowed={windowed}
          rolloutCohort={rolloutCohort}
          featureFlags={featureFlags}
          onThemeModeChange={onThemeModeChange}
          onMotionModeChange={onMotionModeChange}
          onDensityModeChange={onDensityModeChange}
          onAppLocaleChange={onAppLocaleChange}
          onGameplayLocaleChange={onGameplayLocaleChange}
          onToggleSafeExport={onToggleSafeExport}
          onToggleGamepadEnabled={onToggleGamepadEnabled}
          onToggleWindowed={onToggleWindowed}
          onRolloutCohortChange={onRolloutCohortChange}
          onToggleFeatureFlag={onToggleFeatureFlag}
        />
      ) : null}
    </section>
  );
}

export default memo(WorkspaceRoute);
