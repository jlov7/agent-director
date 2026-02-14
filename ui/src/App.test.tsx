import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useTrace } from './hooks/useTrace';

vi.mock('./hooks/useTrace');

const mockedUseTrace = vi.mocked(useTrace);

describe('App empty state', () => {
  beforeEach(() => {
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
});
