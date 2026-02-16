import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import JourneyPanel from '../common/JourneyPanel';
import type { TraceSummary } from '../../types';

const trace: TraceSummary = {
  id: 'trace-journey',
  name: 'Journey test',
  startedAt: '2026-02-16T10:00:00Z',
  endedAt: '2026-02-16T10:00:08Z',
  status: 'completed',
  metadata: {
    source: 'manual',
    agentName: 'agent',
    modelId: 'model',
    wallTimeMs: 8000,
  },
  steps: [
    {
      id: 's1',
      index: 0,
      type: 'llm_call',
      name: 'Plan',
      startedAt: '2026-02-16T10:00:00Z',
      endedAt: '2026-02-16T10:00:01Z',
      durationMs: 1000,
      status: 'completed',
      childStepIds: [],
    },
    {
      id: 's2',
      index: 1,
      type: 'tool_call',
      name: 'Fetch',
      startedAt: '2026-02-16T10:00:01Z',
      endedAt: '2026-02-16T10:00:06Z',
      durationMs: 5000,
      status: 'failed',
      childStepIds: [],
    },
  ],
};

describe('JourneyPanel', () => {
  it('renders priority queue and triggers queue action', () => {
    const onPriorityAction = vi.fn();
    render(
      <JourneyPanel
        trace={trace}
        mode="cinema"
        playheadMs={0}
        selectedStepId={null}
        compareTrace={null}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        onModeChange={vi.fn()}
        onSelectStep={vi.fn()}
        onJumpToBottleneck={vi.fn()}
        onReplay={vi.fn()}
        priorityQueue={[
          {
            id: 'p1',
            title: 'Investigate failure',
            detail: 'First failed step should be opened.',
            severity: 'high',
            actionLabel: 'Open failed step',
            onAction: onPriorityAction,
          },
        ]}
      />
    );

    expect(screen.getByText('Priority queue')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open failed step' }));
    expect(onPriorityAction).toHaveBeenCalledTimes(1);
  });

  it('shows next priority chip in collapsed mode', () => {
    render(
      <JourneyPanel
        trace={trace}
        mode="cinema"
        playheadMs={0}
        selectedStepId={null}
        compareTrace={null}
        collapsed={true}
        onToggleCollapsed={vi.fn()}
        onModeChange={vi.fn()}
        onSelectStep={vi.fn()}
        onJumpToBottleneck={vi.fn()}
        onReplay={vi.fn()}
        priorityQueue={[
          {
            id: 'p1',
            title: 'Investigate failure',
            detail: 'First failed step should be opened.',
            severity: 'high',
            actionLabel: 'Open failed step',
            onAction: vi.fn(),
          },
        ]}
      />
    );

    expect(screen.getByText(/Next priority: Investigate failure/i)).toBeInTheDocument();
  });
});
