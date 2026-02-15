import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MiniTimeline from '../CinemaMode/MiniTimeline';
import type { StepSummary } from '../../types';

const steps: StepSummary[] = [
  {
    id: 's1',
    index: 0,
    type: 'llm_call',
    name: 'Plan',
    startedAt: '2026-01-27T10:00:00.000Z',
    endedAt: '2026-01-27T10:00:01.000Z',
    status: 'completed',
    childStepIds: [],
  },
];

describe('MiniTimeline', () => {
  it('renders timeline studio controls for bookmarks and clip management', () => {
    render(
      <MiniTimeline
        traceStart="2026-01-27T10:00:00.000Z"
        traceEnd="2026-01-27T10:00:05.000Z"
        steps={steps}
        playheadMs={1000}
        windowRange={{ startMs: 0, endMs: 5000 }}
        windowed
        spanMs={5000}
        onSpanChange={vi.fn()}
        onToggleWindowed={vi.fn()}
        onScrub={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Add bookmark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous bookmark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next bookmark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set clip start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set clip end' })).toBeInTheDocument();
  });

  it('renders bookmark markers on the density map', () => {
    render(
      <MiniTimeline
        traceStart="2026-01-27T10:00:00.000Z"
        traceEnd="2026-01-27T10:00:05.000Z"
        steps={steps}
        playheadMs={1000}
        windowRange={{ startMs: 0, endMs: 5000 }}
        windowed
        spanMs={5000}
        onSpanChange={vi.fn()}
        onToggleWindowed={vi.fn()}
        onScrub={vi.fn()}
      />
    );

    expect(screen.getByTestId('timeline-bookmark-markers')).toBeInTheDocument();
  });

  it('exports the active clip from timeline studio controls', () => {
    const onScrub = vi.fn();
    render(
      <MiniTimeline
        traceStart="2026-01-27T10:00:00.000Z"
        traceEnd="2026-01-27T10:00:05.000Z"
        steps={steps}
        playheadMs={1000}
        windowRange={{ startMs: 0, endMs: 5000 }}
        windowed
        spanMs={5000}
        onSpanChange={vi.fn()}
        onToggleWindowed={vi.fn()}
        onScrub={onScrub}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export clip' }));
    expect(onScrub).not.toHaveBeenCalled();
  });
});
