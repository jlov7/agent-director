import type { FeatureFlags } from '../utils/saasUx';

type SettingsRouteProps = {
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
};

export default function SettingsRoute({
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
}: SettingsRouteProps) {
  const trustSummary = safeExport
    ? 'Safe export is enabled. Raw payload controls are redacted by default.'
    : 'Safe export is disabled. Raw payload controls may expose sensitive context.';
  const roleSummary =
    workspaceRole === 'viewer'
      ? 'Viewer role can inspect but cannot mutate sensitive workflow actions.'
      : workspaceRole === 'operator'
        ? 'Operator role can execute route actions with confirmation on high-risk changes.'
        : 'Admin role can manage all workspace controls and feature switches.';

  return (
    <div className="workspace-context-grid route-context-grid" data-route-panel="settings">
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
    </div>
  );
}
