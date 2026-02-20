import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import WorkspaceRoute from '../WorkspaceRoute';
import type { UxRebootRoute } from '../routeConfig';

const defaultProps = {
  route: 'overview' as UxRebootRoute,
  status: 'completed' as const,
  runHealthScore: 92,
  workspaceRole: 'operator' as const,
  runOwner: 'on-call-operator',
  handoffOwner: 'incident-commander',
  routeProgress: { completed: 1, total: 4 },
  lastCompletedAction: null,
  actionHistory: [],
  snapshots: [],
  activityFeed: [],
  asyncTimeline: [],
  themeMode: 'studio' as const,
  motionMode: 'balanced' as const,
  densityMode: 'auto' as const,
  appLocale: 'en' as const,
  gameplayLocale: 'en' as const,
  safeExport: false,
  gamepadEnabled: true,
  windowed: false,
  rolloutCohort: 'off' as const,
  featureFlags: {
    setupWizardV1: true,
    supportPanelV1: true,
    exportCenterV1: true,
    ownershipPanelV1: true,
  },
  onRouteAction: vi.fn(),
  onRetryAsyncAction: vi.fn(),
  onResumeAsyncAction: vi.fn(),
  onRetryExportTask: vi.fn(),
  onRunOwnerChange: vi.fn(),
  onHandoffOwnerChange: vi.fn(),
  onThemeModeChange: vi.fn(),
  onMotionModeChange: vi.fn(),
  onDensityModeChange: vi.fn(),
  onAppLocaleChange: vi.fn(),
  onGameplayLocaleChange: vi.fn(),
  onToggleSafeExport: vi.fn(),
  onToggleGamepadEnabled: vi.fn(),
  onToggleWindowed: vi.fn(),
  onRolloutCohortChange: vi.fn(),
  onToggleFeatureFlag: vi.fn(),
};

describe('WorkspaceRoute', () => {
  it('renders explicit route outcome copy for overview', () => {
    render(<WorkspaceRoute {...defaultProps} route="overview" />);

    expect(screen.getByText('Route outcome')).toBeInTheDocument();
    expect(screen.getByText('Understand run health, risk, and the next decision in under a minute.')).toBeInTheDocument();
    expect(screen.getByText('Route progress')).toBeInTheDocument();
  });

  it('renders triage sequence action cards in task order', () => {
    render(<WorkspaceRoute {...defaultProps} route="triage" />);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(headings).toContain('Observe the incident');
    expect(headings).toContain('Isolate the cause');
    expect(headings).toContain('Validate the fix');
    expect(headings).toContain('Share the handoff');
  });

  it('renders one primary and one alternate action in overview empty state', () => {
    render(<WorkspaceRoute {...defaultProps} route="overview" status={null} />);

    const overviewStateCard = screen.getByRole('heading', { name: 'Overview state' }).closest('article');
    expect(overviewStateCard).not.toBeNull();
    const card = overviewStateCard as HTMLElement;
    expect(within(card).getByRole('button', { name: 'Review run health' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Inspect top risk' })).toBeInTheDocument();
  });

  it('shows resume marker when last completed action exists', () => {
    render(
      <WorkspaceRoute
        {...defaultProps}
        route="diagnose"
        lastCompletedAction={{ id: 'diagnose-validate', label: 'Validate hypothesis', at: '2026-02-20T21:00:00Z' }}
      />
    );

    expect(screen.getByText('Resume here: Validate hypothesis')).toBeInTheDocument();
  });

  it('renders unified async/export timeline rows on diagnose route', () => {
    render(
      <WorkspaceRoute
        {...defaultProps}
        route="diagnose"
        asyncTimeline={[
          {
            id: 'async:matrix',
            source: 'async',
            label: 'Replay matrix run',
            status: 'running',
            detail: 'Running what-if scenarios',
            updatedAt: Date.now(),
            retryable: false,
            resumable: false,
          },
          {
            id: 'export:narrative',
            source: 'export',
            label: 'Narrative export',
            status: 'error',
            detail: 'Network timeout',
            updatedAt: Date.now() - 1000,
            retryable: true,
            resumable: false,
          },
        ]}
      />
    );

    expect(screen.getByText('Execution timeline')).toBeInTheDocument();
    expect(screen.getByText('Replay matrix run')).toBeInTheDocument();
    expect(screen.getByText('Narrative export')).toBeInTheDocument();
  });

  it('renders success and failure route state confirmations', () => {
    const { rerender } = render(<WorkspaceRoute {...defaultProps} route="diagnose" status="completed" />);
    expect(screen.getByText(/What changed:/)).toBeInTheDocument();

    rerender(<WorkspaceRoute {...defaultProps} route="triage" status="failed" />);
    const triageStateCard = screen.getByRole('heading', { name: 'Triage state' }).closest('article');
    expect(triageStateCard).not.toBeNull();
    const card = triageStateCard as HTMLElement;
    expect(within(card).getByRole('button', { name: 'Observe now' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Isolate cause' })).toBeInTheDocument();
  });

  it('allows route action dispatch from cards', () => {
    const onRouteAction = vi.fn();
    render(<WorkspaceRoute {...defaultProps} route="overview" onRouteAction={onRouteAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Review run health' }));
    expect(onRouteAction).toHaveBeenCalledWith('overview-review-health');
  });
});
