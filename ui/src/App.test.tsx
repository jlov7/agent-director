import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { useTrace } from './hooks/useTrace';
import demoTrace from './data/demoTrace.json';
import type { TraceSummary } from './types';
import { JOURNEY_METRIC_STORAGE_KEY, readJourneyMetrics } from './ux/metrics';

vi.mock('./hooks/useTrace');

const mockedUseTrace = vi.mocked(useTrace);

describe('App empty state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedUseTrace.mockReturnValue({
      trace: null,
      insights: null,
      loading: false,
      error: null,
      reload: vi.fn(),
      traces: [],
      selectedTraceId: null,
      setSelectedTraceId: vi.fn(),
    });
  });

  it('shows onboarding-friendly empty state when no traces exist', () => {
    render(<App />);

    expect(screen.getByText('No traces yet')).toBeInTheDocument();
    expect(screen.getByText(/ingest your first trace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows explicit failure state copy and help link when an error occurs', () => {
    mockedUseTrace.mockReturnValue({
      trace: null,
      insights: null,
      loading: false,
      error: 'Trace service unavailable',
      reload: vi.fn(),
      traces: [],
      selectedTraceId: null,
      setSelectedTraceId: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Trace service unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open help' })).toHaveAttribute('href', '/help.html');
  });

  it('applies app locale copy from persisted settings', () => {
    window.localStorage.setItem('agentDirector.locale.v1', JSON.stringify('es'));
    mockedUseTrace.mockReturnValue({
      trace: demoTrace as TraceSummary,
      insights: null,
      loading: false,
      error: null,
      reload: vi.fn(),
      traces: [demoTrace as TraceSummary],
      selectedTraceId: (demoTrace as TraceSummary).id,
      setSelectedTraceId: vi.fn(),
    });

    render(<App />);

    expect(screen.getByRole('button', { name: 'Cine' })).toBeInTheDocument();
  });
});

describe('App journey telemetry', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedUseTrace.mockReturnValue({
      trace: demoTrace as TraceSummary,
      insights: null,
      loading: false,
      error: null,
      reload: vi.fn(),
      traces: [demoTrace as TraceSummary],
      selectedTraceId: (demoTrace as TraceSummary).id,
      setSelectedTraceId: vi.fn(),
    });
  });

  it('records onboarding exit metric when intro is skipped', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));

    await waitFor(() => {
      const events = readJourneyMetrics(window.localStorage);
      expect(events.some((event) => event.name === 'journey.onboarding.exit')).toBe(true);
      expect(events.some((event) => event.name === 'journey.first_meaningful_interaction')).toBe(true);
    });
    expect(window.localStorage.getItem(JOURNEY_METRIC_STORAGE_KEY)).toBeTruthy();
  });

  it('records first success metric after first successful action notification', async () => {
    window.localStorage.setItem('agentDirector.introDismissed', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.heroDismissed', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(true));

    render(<App />);

    fireEvent.change(screen.getByLabelText('Saved view name'), {
      target: { value: 'My triage view' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save view' }));

    await waitFor(() => {
      const events = readJourneyMetrics(window.localStorage);
      expect(events.some((event) => event.name === 'journey.first_success')).toBe(true);
    });
  });

  it('auto-recovers stale route-shell sessions from local storage', async () => {
    const startedAt = Date.now();
    window.localStorage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.sessionExpiresAt.v1', JSON.stringify(startedAt - 60_000));
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(false));
    window.localStorage.setItem('agentDirector.workspaceRole.v1', JSON.stringify('viewer'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));

    render(<App />);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('agentDirector.workspacePanelOpen.v1') ?? 'false')).toBe(true);
      expect(JSON.parse(window.localStorage.getItem('agentDirector.workspaceRole.v1') ?? '"viewer"')).toBe('operator');
      expect(JSON.parse(window.localStorage.getItem('agentDirector.onboarding.stage.v1') ?? '"completed"')).toBe('select');
      expect(JSON.parse(window.localStorage.getItem('agentDirector.sessionExpiresAt.v1') ?? '0')).toBeGreaterThan(startedAt);
    });

    expect(screen.getByText('What are you here to do?')).toBeInTheDocument();
  });

  it('uses orchestrated onboarding in route shell and records safe-skip abandonment', async () => {
    window.localStorage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(true));

    render(<App />);

    expect(screen.getByText('What are you here to do?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    await waitFor(() => {
      const events = readJourneyMetrics(window.localStorage);
      expect(events.some((event) => event.name === 'journey.onboarding.abandon')).toBe(true);
    });
    expect(screen.getByText('Skipped for now')).toBeInTheDocument();
  });

  it('records first-value onboarding telemetry for selected path in route shell', async () => {
    window.localStorage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('investigate'));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Start first win' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open flow mode' }));

    await waitFor(() => {
      const events = readJourneyMetrics(window.localStorage);
      expect(events.some((event) => event.name === 'journey.onboarding.first_value')).toBe(true);
    });
  });
});
