import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Inspector from '../Inspector';
import type { StepSummary } from '../../types';
import * as api from '../../store/api';

// Mock the API module
vi.mock('../../store/api', () => ({
  fetchStepDetails: vi.fn(),
  fetchComments: vi.fn(),
  createComment: vi.fn(),
}));

const mockStep: StepSummary = {
  id: 'step-1',
  index: 0,
  type: 'llm_call',
  name: 'Analyze Request',
  startedAt: '2026-01-27T10:00:00.000Z',
  endedAt: '2026-01-27T10:00:05.000Z',
  durationMs: 5000,
  status: 'completed',
  childStepIds: [],
  metrics: {
    tokensTotal: 500,
    costUsd: 0.015,
  },
};

const mockDetails = {
  ...mockStep,
  data: {
    role: 'assistant',
    content: 'Test content',
    model: 'gpt-4o',
    usage: { prompt_tokens: 200, completion_tokens: 300, total_tokens: 500 },
  },
  redaction: {
    mode: 'redacted' as const,
    fieldsRedacted: [
      { path: 'data.secret', kind: 'secret' as const },
      { path: 'data.email', kind: 'pii' as const },
    ],
    revealedFields: [],
  },
};

describe('Inspector', () => {
  const mockOnClose = vi.fn();
  const mockOnReplay = vi.fn();
  const mockFetchStepDetails = api.fetchStepDetails as ReturnType<typeof vi.fn>;
  const mockFetchComments = api.fetchComments as ReturnType<typeof vi.fn>;
  const mockCreateComment = api.createComment as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStepDetails.mockImplementation(() => new Promise(() => {}));
    mockFetchComments.mockResolvedValue([]);
    mockCreateComment.mockResolvedValue(null);
  });

  it('renders nothing when step is null', () => {
    const { container } = render(
      <Inspector
        traceId="trace-1"
        step={null}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the inspector panel when step is provided', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByText('Analyze Request')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('displays step name and type', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByText('Analyze Request')).toBeInTheDocument();
    expect(screen.getByText('llm_call')).toBeInTheDocument();
  });

  it('displays step status', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    // Status appears in header badge and in the details section
    const statusElements = screen.getAllByText('completed');
    expect(statusElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays step duration', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByText('5000ms')).toBeInTheDocument();
  });

  it('displays step metrics', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByText('500')).toBeInTheDocument(); // tokens
    expect(screen.getByText('$0.015')).toBeInTheDocument(); // cost
  });

  it('calls onClose when Close button is clicked', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onReplay when Replay button is clicked', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replay from this step' }));
    expect(mockOnReplay).toHaveBeenCalledWith('step-1');
  });

  it('fetches step details on mount', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(mockFetchStepDetails).toHaveBeenCalledWith(
        'trace-1',
        'step-1',
        'redacted',
        [],
        false
      );
    });
  });

  it('displays loading state initially', async () => {
    // Delay the mock to see loading state
    mockFetchStepDetails.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockDetails), 100))
    );

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays JSON payload when details are loaded', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/"role": "assistant"/)).toBeInTheDocument();
    });
  });

  it('shows raw payload checkbox', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByLabelText(/Reveal raw/)).toBeInTheDocument();
  });

  it('toggles to raw mode when checkbox is clicked', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    const checkbox = screen.getByLabelText(/Reveal raw/);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockFetchStepDetails).toHaveBeenCalledWith(
        'trace-1',
        'step-1',
        'raw',
        [],
        false
      );
    });
  });

  it('disables raw toggle when safeExport is true', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={true}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    const checkbox = screen.getByLabelText(/Reveal raw/);
    expect(checkbox).toBeDisabled();
  });

  it('shows Copy JSON button', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    expect(screen.getByRole('button', { name: 'Copy payload JSON' })).toBeInTheDocument();
  });

  it('copies JSON to clipboard when Copy JSON is clicked', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy payload JSON' }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  it('displays redacted fields list', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Redacted fields:')).toBeInTheDocument();
    });
    // Check for partial text matches for the field paths
    expect(screen.getByText(/data\.secret.*secret/)).toBeInTheDocument();
    expect(screen.getByText(/data\.email.*pii/)).toBeInTheDocument();
  });

  it('shows reveal buttons for redacted fields when not in safeExport mode', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Redacted fields:')).toBeInTheDocument();
    });

    // Get all buttons with "Reveal" text (aria-label contains "Reveal")
    const revealButtons = screen.getAllByRole('button', { name: /^Reveal / });
    expect(revealButtons.length).toBeGreaterThan(0);
  });

  it('hides reveal buttons when in safeExport mode', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={true}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Redacted fields:')).toBeInTheDocument();
    });

    // Should not have any reveal buttons for specific fields (buttons with aria-label starting with "Reveal ")
    const revealButtons = screen.queryAllByRole('button', { name: /^Reveal data\./ });
    expect(revealButtons.length).toBe(0);
  });

  it('reveals field when Reveal button is clicked', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Redacted fields:')).toBeInTheDocument();
    });

    // Find the Reveal button for data.secret using aria-label
    const revealButton = screen.getByRole('button', { name: /Reveal data\.secret/ });
    fireEvent.click(revealButton);

    await waitFor(() => {
      expect(mockFetchStepDetails).toHaveBeenCalledWith(
        'trace-1',
        'step-1',
        'redacted',
        ['data.secret'],
        false
      );
    });
  });

  it('shows Reset reveals button when fields are revealed', async () => {
    const detailsWithRevealed = {
      ...mockDetails,
      redaction: {
        ...mockDetails.redaction,
        revealedFields: [{ path: 'data.secret', kind: 'secret' as const }],
      },
    };
    mockFetchStepDetails.mockResolvedValue(detailsWithRevealed);

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    // Wait for details to load
    await waitFor(() => {
      expect(screen.getByText('Redacted fields:')).toBeInTheDocument();
    });

    // Reveal a field by clicking the reveal button
    const revealButton = screen.getByRole('button', { name: /Reveal data\.secret/ });
    fireEvent.click(revealButton);

    await waitFor(() => {
      // Look for the Reset reveals button
      expect(screen.getByRole('button', { name: /Reset revealed fields/ })).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    const aside = screen.getByRole('complementary');
    expect(aside).toHaveAttribute('data-help');
    expect(aside).toHaveAttribute('data-tour', 'inspector');
  });

  it('displays dash when metrics are not available', async () => {
    const stepWithoutMetrics: StepSummary = {
      ...mockStep,
      metrics: undefined,
    };

    render(
      <Inspector
        traceId="trace-1"
        step={stepWithoutMetrics}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    // Find the Tokens and Cost rows and check for dash
    const tokensDash = screen.getAllByText('-');
    expect(tokensDash.length).toBeGreaterThanOrEqual(1);
  });

  it('resets state when step changes', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);

    const { rerender } = render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    // Wait for details to load
    await waitFor(() => {
      expect(screen.getByText('Redacted fields:')).toBeInTheDocument();
    });

    const revealButton = screen.getByRole('button', { name: /Reveal data\.secret/ });
    fireEvent.click(revealButton);

    // Change to a different step
    const newStep: StepSummary = {
      ...mockStep,
      id: 'step-2',
      name: 'New Step',
    };

    rerender(
      <Inspector
        traceId="trace-1"
        step={newStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    // Should fetch with empty revealedPaths for the new step
    await waitFor(() => {
      expect(mockFetchStepDetails).toHaveBeenCalledWith(
        'trace-1',
        'step-2',
        'redacted',
        [],
        false
      );
    });
  });

  it('creates collaboration note from inspector', async () => {
    mockFetchStepDetails.mockResolvedValue(mockDetails);
    mockFetchComments.mockResolvedValue([]);
    mockCreateComment.mockResolvedValue({
      id: 'c1',
      traceId: 'trace-1',
      stepId: 'step-1',
      author: 'director',
      body: 'Look into this',
      pinned: false,
      createdAt: '2026-02-15T02:00:00.000Z',
    });

    render(
      <Inspector
        traceId="trace-1"
        step={mockStep}
        safeExport={false}
        onClose={mockOnClose}
        onReplay={mockOnReplay}
      />
    );

    const textarea = screen.getByLabelText('Comment body');
    fireEvent.change(textarea, { target: { value: 'Look into this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith('trace-1', 'step-1', 'director', 'Look into this', false);
    });
  });
});
