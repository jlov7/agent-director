import { memo } from 'react';
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
const ROUTE_SUCCESS_COPY: Record<UxRebootRoute, string> = {
  overview: 'One clear health and risk decision is recorded for this run.',
  triage: 'Incident path reaches validated fix and handoff-ready state.',
  diagnose: 'Hypothesis is validated with exportable evidence.',
  coordinate: 'Ownership and handoff snapshot are both captured.',
  settings: 'Trust defaults and feature controls are explicitly confirmed.',
};
const ROUTE_EXCLUSION_COPY: Record<UxRebootRoute, string> = {
  overview: 'Deep replay matrix editing belongs in Diagnose.',
  triage: 'Long-form narrative exports belong in Diagnose.',
  diagnose: 'Ownership handoff operations belong in Coordinate.',
  coordinate: 'Feature flag and locale configuration belong in Settings.',
  settings: 'Incident execution steps belong in Triage and Diagnose.',
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
  retentionDays,
  governanceBusy,
  governanceStatus,
  auditEvents,
  evalCases,
  evalRun,
  evalBusy,
  evalStatus,
  traceEvidenceSummary,
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
  onGovernanceRetentionChange,
  onApplyGovernanceRetention,
  onDeleteActiveTrace,
  onRefreshGovernance,
  onCreateEvalCase,
  onRunEvalCases,
}: WorkspaceRouteProps) {
  const routeTitleId = `workspace-route-${route}`;

  return (
    <section className="workspace-route-shell motion-route-enter" aria-labelledby={routeTitleId}>
      <h2 id={routeTitleId} className="sr-only">
        {ROUTE_LABEL[route]} route workspace
      </h2>
      <article className="workspace-card route-outcome-card route-education-card">
        <h3>Route outcome</h3>
        <p>{ROUTE_OUTCOME_COPY[route]}</p>
        <p className="route-outcome-subcopy">Role context: {workspaceRole}. Keep one intent active until complete.</p>
        <ul className="route-contract-list">
          <li>
            <strong>Success:</strong> {ROUTE_SUCCESS_COPY[route]}
          </li>
          <li>
            <strong>Not this screen:</strong> {ROUTE_EXCLUSION_COPY[route]}
          </li>
        </ul>
      </article>

      <RouteProgressStrip
        routeLabel={ROUTE_LABEL[route]}
        completed={routeProgress.completed}
        total={routeProgress.total}
        lastCompletedAction={lastCompletedAction}
      />

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
          evalCases={evalCases}
          evalRun={evalRun}
          evalBusy={evalBusy}
          evalStatus={evalStatus}
          traceEvidenceSummary={traceEvidenceSummary}
          onRetryAsyncAction={onRetryAsyncAction}
          onResumeAsyncAction={onResumeAsyncAction}
          onRetryExportTask={onRetryExportTask}
          onCreateEvalCase={onCreateEvalCase}
          onRunEvalCases={onRunEvalCases}
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
          status={status}
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
          retentionDays={retentionDays}
          governanceBusy={governanceBusy}
          governanceStatus={governanceStatus}
          auditEvents={auditEvents}
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
          onGovernanceRetentionChange={onGovernanceRetentionChange}
          onApplyGovernanceRetention={onApplyGovernanceRetention}
          onDeleteActiveTrace={onDeleteActiveTrace}
          onRefreshGovernance={onRefreshGovernance}
        />
      ) : null}
    </section>
  );
}

export default memo(WorkspaceRoute);
