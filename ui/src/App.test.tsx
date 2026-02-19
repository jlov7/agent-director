import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useTrace } from './hooks/useTrace';
import demoTrace from './data/demoTrace.json';
import type { TraceSummary } from './types';

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
