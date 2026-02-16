import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DirectorBrief from '../common/DirectorBrief';
import type { TraceSummary } from '../../types';

const trace: TraceSummary = {
  id: 'trace-1',
  name: 'Demo trace',
  startedAt: '2026-02-15T10:00:00Z',
  endedAt: '2026-02-15T10:00:05Z',
  status: 'completed',
  metadata: {
    source: 'manual',
    agentName: 'agent',
    modelId: 'model',
    wallTimeMs: 5000,
  },
  steps: [
    {
      id: 's1',
      index: 0,
      type: 'llm_call',
      name: 'Plan',
      startedAt: '2026-02-15T10:00:00Z',
      endedAt: '2026-02-15T10:00:01Z',
      durationMs: 1000,
      status: 'completed',
      childStepIds: [],
    },
  ],
};

describe('DirectorBrief', () => {
  it('shows progressive disclosure lock messages for early mission stage', () => {
    render(
      <DirectorBrief
        trace={trace}
        mode="cinema"
        selectedStepId={null}
        onModeChange={vi.fn()}
        onSelectStep={vi.fn()}
        onJumpToBottleneck={vi.fn()}
        onReplay={vi.fn()}
        missionProgress={{ playback: false, inspect: false }}
        missionCompletion={{ done: 0, total: 7, pct: 0 }}
      />
    );

    expect(screen.getByText(/unlock ai narrative tools/i)).toBeInTheDocument();
    expect(screen.getByText(/unlock collaboration activity feed/i)).toBeInTheDocument();
  });

  it('enables director ask flow once analysis missions are unlocked', () => {
    render(
      <DirectorBrief
        trace={trace}
        mode="cinema"
        selectedStepId="s1"
        onModeChange={vi.fn()}
        onSelectStep={vi.fn()}
        onJumpToBottleneck={vi.fn()}
        onReplay={vi.fn()}
        missionProgress={{ playback: true, inspect: true, flow: true, replay: true, collaborate: true }}
        missionCompletion={{ done: 5, total: 7, pct: 71 }}
        recommendations={[
          {
            id: 'r1',
            title: 'Check Plan step',
            body: 'Plan step drives most latency.',
            actionLabel: 'Open step',
            tone: 'priority',
            action: vi.fn(),
          },
        ]}
        narrative="Run summary narrative."
        onAskDirector={() => 'Director answer'}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Narrative' }));
    fireEvent.change(screen.getByLabelText('Ask director question'), { target: { value: 'What changed?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(screen.getByText('Director answer')).toBeInTheDocument();
    expect(screen.getByText(/1\. Open step/i)).toBeInTheDocument();
  });
});
