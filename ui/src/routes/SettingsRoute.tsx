import { useEffect, useState } from 'react';
import type { FeatureFlags } from '../utils/saasUx';
import type { WorkspaceRouteStatus } from './workspaceRouteTypes';

type SettingsRouteProps = {
  status: WorkspaceRouteStatus;
  workspaceRole: 'viewer' | 'operator' | 'admin';
  themeMode: 'studio' | 'focus' | 'contrast';
  motionMode: 'cinematic' | 'balanced' | 'minimal';
  densityMode: 'auto' | 'comfortable' | 'compact';
  appLocale: 'en' | 'es';
  gameplayLocale: 'en' | 'es';
  safeExport: boolean;
  gamepadEnabled: boolean;
  windowed: boolean;
  rolloutCohort: 'off' | 'internal' | 'pilot' | 'ga';
  retentionDays: number;
  governanceBusy: boolean;
  governanceStatus: string | null;
  auditEvents: Array<{
    id: string;
    actor: string;
    eventType: string;
    createdAt: string;
  }>;
  featureFlags: FeatureFlags;
  onThemeModeChange: (value: 'studio' | 'focus' | 'contrast') => void;
  onMotionModeChange: (value: 'cinematic' | 'balanced' | 'minimal') => void;
  onDensityModeChange: (value: 'auto' | 'comfortable' | 'compact') => void;
  onAppLocaleChange: (value: 'en' | 'es') => void;
  onGameplayLocaleChange: (value: 'en' | 'es') => void;
  onToggleSafeExport: () => void;
  onToggleGamepadEnabled: () => void;
  onToggleWindowed: () => void;
  onRolloutCohortChange: (value: 'off' | 'internal' | 'pilot' | 'ga') => void;
  onToggleFeatureFlag: (key: keyof FeatureFlags) => void;
  onGovernanceRetentionChange: (days: number) => void;
  onApplyGovernanceRetention: () => void;
  onDeleteActiveTrace: () => void;
  onRefreshGovernance: () => void;
};

export default function SettingsRoute({
  status,
  workspaceRole,
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
  featureFlags,
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
}: SettingsRouteProps) {
  const [retentionDraft, setRetentionDraft] = useState(String(retentionDays));
  useEffect(() => {
    setRetentionDraft(String(retentionDays));
  }, [retentionDays]);
  const trustSummary = safeExport
    ? 'Safe export is ON. Sensitive payload fields stay redacted unless explicitly revealed.'
    : 'Safe export is OFF. Exports may include sensitive payload context.';
  const roleSummary =
    workspaceRole === 'viewer'
      ? 'Viewer can inspect, but cannot execute write actions.'
      : workspaceRole === 'operator'
        ? 'Operator can execute route actions; high-impact changes require explicit confirmation.'
        : 'Admin can manage workspace defaults, trust controls, and rollout switches.';
  const nextTrustStepLabel = safeExport ? 'Safe export already enabled' : 'Enable safe export';
  const nextTrustStepAction = safeExport ? undefined : onToggleSafeExport;

  return (
    <div className="workspace-context-grid route-context-grid" data-route-panel="settings">
      <article className="workspace-card route-state-card route-focal-card">
        <h3>Settings state</h3>
        {status === null ? <p>No run context loaded. Start by confirming trust defaults before sharing outputs.</p> : null}
        {status === 'loading' ? <p>Settings context is loading. Confirm trust defaults as soon as controls are ready.</p> : null}
        {status === 'failed' ? (
          <p>Run failed. Confirm trust defaults first, then open support from the failing route.</p>
        ) : null}
        {status === 'running' ? <p>Run is active. Keep trust defaults stable while responders operate.</p> : null}
        {status === 'completed' ? <p>Run is complete. Confirm sharing defaults before final handoff.</p> : null}
        <div className="route-state-actions">
          <button className="primary-button" type="button" onClick={nextTrustStepAction} disabled={!nextTrustStepAction}>
            {nextTrustStepLabel}
          </button>
        </div>
      </article>

      <article className="workspace-card">
        <h3>Interface defaults</h3>
        <div className="workspace-inline-form">
          <label>
            Theme
            <select className="search-select" value={themeMode} onChange={(event) => onThemeModeChange(event.target.value as 'studio' | 'focus' | 'contrast')}>
              <option value="studio">Studio</option>
              <option value="focus">Focus</option>
              <option value="contrast">Contrast</option>
            </select>
          </label>
          <label>
            Motion
            <select className="search-select" value={motionMode} onChange={(event) => onMotionModeChange(event.target.value as 'cinematic' | 'balanced' | 'minimal')}>
              <option value="cinematic">Cinematic</option>
              <option value="balanced">Balanced</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label>
            Density
            <select className="search-select" value={densityMode} onChange={(event) => onDensityModeChange(event.target.value as 'auto' | 'comfortable' | 'compact')}>
              <option value="auto">Auto</option>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
      </article>

      <article className="workspace-card">
        <h3>Localization and controls</h3>
        <div className="workspace-inline-form">
          <label>
            App language
            <select className="search-select" value={appLocale} onChange={(event) => onAppLocaleChange(event.target.value as 'en' | 'es')}>
              <option value="en">English</option>
              <option value="es">Espanol</option>
            </select>
          </label>
          <label>
            Gameplay language
            <select className="search-select" value={gameplayLocale} onChange={(event) => onGameplayLocaleChange(event.target.value as 'en' | 'es')}>
              <option value="en">English</option>
              <option value="es">Espanol</option>
            </select>
          </label>
        </div>
        <div className="workspace-inline-form">
          <label className="toggle">
            <input type="checkbox" checked={safeExport} onChange={onToggleSafeExport} />
            Safe export
          </label>
          <label className="toggle">
            <input type="checkbox" checked={gamepadEnabled} onChange={onToggleGamepadEnabled} />
            Gamepad enabled
          </label>
          <label className="toggle">
            <input type="checkbox" checked={windowed} onChange={onToggleWindowed} />
            Timeline windowing
          </label>
        </div>
      </article>

      <article className="workspace-card">
        <h3>Feature controls</h3>
        <div className="workspace-inline-form">
          <label className="toggle">
            <input type="checkbox" checked={featureFlags.setupWizardV1} onChange={() => onToggleFeatureFlag('setupWizardV1')} />
            Setup wizard
          </label>
          <label className="toggle">
            <input type="checkbox" checked={featureFlags.supportPanelV1} onChange={() => onToggleFeatureFlag('supportPanelV1')} />
            Support diagnostics
          </label>
          <label className="toggle">
            <input type="checkbox" checked={featureFlags.exportCenterV1} onChange={() => onToggleFeatureFlag('exportCenterV1')} />
            Export center
          </label>
          <label className="toggle">
            <input type="checkbox" checked={featureFlags.ownershipPanelV1} onChange={() => onToggleFeatureFlag('ownershipPanelV1')} />
            Ownership panel
          </label>
        </div>
        <div className="workspace-inline-form">
          <label>
            UX reboot cohort
            <select
              className="search-select"
              value={rolloutCohort}
              onChange={(event) => onRolloutCohortChange(event.target.value as 'off' | 'internal' | 'pilot' | 'ga')}
            >
              <option value="off">Off</option>
              <option value="internal">Internal</option>
              <option value="pilot">Pilot</option>
              <option value="ga">General availability</option>
            </select>
          </label>
        </div>
      </article>

      <article className="workspace-card route-state-card" aria-live="polite">
        <h3>Trust and access state</h3>
        <p>{trustSummary}</p>
        <p className="route-state-summary">Role constraints: {roleSummary}</p>
      </article>

      {!safeExport ? (
        <article className="workspace-card route-state-card route-education-card">
          <h3>Why this matters now</h3>
          <p>Enable safe export before sharing diagnostics to reduce accidental sensitive-data exposure.</p>
          <div className="route-state-actions">
            <button className="primary-button" type="button" onClick={onToggleSafeExport}>
              Enable safe export
            </button>
          </div>
        </article>
      ) : null}

      <article className="workspace-card route-state-card">
        <h3>Retention and audit controls</h3>
        <p>Set data retention policy, apply cleanup, and review major operational actions.</p>
        <div className="workspace-inline-form">
          <label>
            Retention days
            <input
              className="search-input"
              type="number"
              min={1}
              max={365}
              value={retentionDraft}
              onChange={(event) => setRetentionDraft(event.target.value)}
            />
          </label>
        </div>
        <div className="route-state-actions">
          <button
            className="primary-button"
            type="button"
            disabled={governanceBusy}
            onClick={() => onGovernanceRetentionChange(Number(retentionDraft))}
          >
            Save retention policy
          </button>
          <button className="ghost-button" type="button" disabled={governanceBusy} onClick={onApplyGovernanceRetention}>
            Apply retention now
          </button>
          <button className="ghost-button" type="button" disabled={governanceBusy} onClick={onRefreshGovernance}>
            Refresh audit
          </button>
          <button className="ghost-button" type="button" disabled={governanceBusy} onClick={onDeleteActiveTrace}>
            Delete active trace
          </button>
        </div>
        <p className="route-state-summary">
          {governanceStatus ?? `Current retention policy: ${retentionDays} day(s).`}
        </p>
        <ul className="route-contract-list" aria-label="Recent governance audit events">
          {auditEvents.slice(0, 5).map((event) => (
            <li key={event.id}>
              <strong>{event.eventType}</strong> by {event.actor} at {new Date(event.createdAt).toLocaleString()}
            </li>
          ))}
          {auditEvents.length === 0 ? <li>No governance events recorded yet.</li> : null}
        </ul>
      </article>
    </div>
  );
}
