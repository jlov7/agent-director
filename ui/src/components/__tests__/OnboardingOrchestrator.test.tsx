import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import OnboardingOrchestrator from '../onboarding/OnboardingOrchestrator';
import type { FirstWinStep } from '../onboarding/FirstWinChecklist';

const defaultSteps: FirstWinStep[] = [
  { id: 'step-1', label: 'Review run health', done: false, hint: 'Open run summary.' },
  { id: 'step-2', label: 'Inspect top risk', done: false, hint: 'Select the highest risk step.' },
  { id: 'step-3', label: 'Share handoff digest', done: false, hint: 'Send a focused handoff update.' },
];

describe('OnboardingOrchestrator', () => {
  it('renders a single first-run decision and starts checklist flow', () => {
    const onStart = vi.fn();
    const onPathChange = vi.fn();

    render(
      <OnboardingOrchestrator
        stage="select"
        path="evaluate"
        steps={defaultSteps}
        explainEnabled={false}
        onPathChange={onPathChange}
        onStart={onStart}
        onSkipSafely={vi.fn()}
        onStartOver={vi.fn()}
        onStartTour={vi.fn()}
        onToggleExplain={vi.fn()}
        onRecommendedAction={vi.fn()}
        recommendedActionLabel="Open triage board"
      />
    );

    expect(screen.getByText('What are you here to do?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Evaluate/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Operate/ }));
    expect(onPathChange).toHaveBeenCalledWith('operate');

    fireEvent.click(screen.getByRole('button', { name: 'Start first win' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders checklist progress and confidence signal', () => {
    render(
      <OnboardingOrchestrator
        stage="active"
        path="investigate"
        steps={[
          { id: 'step-1', label: 'Open flow graph', done: true, hint: 'Switch to flow mode.' },
          { id: 'step-2', label: 'Run matrix scenario', done: false, hint: 'Create a what-if run.' },
          { id: 'step-3', label: 'Save a reusable view', done: false, hint: 'Save this setup for next time.' },
        ]}
        explainEnabled={false}
        onPathChange={vi.fn()}
        onStart={vi.fn()}
        onSkipSafely={vi.fn()}
        onStartOver={vi.fn()}
        onStartTour={vi.fn()}
        onToggleExplain={vi.fn()}
        onRecommendedAction={vi.fn()}
        recommendedActionLabel="Open flow mode"
      />
    );

    expect(screen.getByText('First win checklist')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 complete')).toBeInTheDocument();
    expect(screen.getByText(/Confidence/)).toBeInTheDocument();
  });

  it('shows safe-skip recommendation and calls recommended action', () => {
    const onRecommendedAction = vi.fn();

    render(
      <OnboardingOrchestrator
        stage="skipped"
        path="operate"
        steps={defaultSteps}
        explainEnabled={false}
        onPathChange={vi.fn()}
        onStart={vi.fn()}
        onSkipSafely={vi.fn()}
        onStartOver={vi.fn()}
        onStartTour={vi.fn()}
        onToggleExplain={vi.fn()}
        onRecommendedAction={onRecommendedAction}
        recommendedActionLabel="Open incident triage"
      />
    );

    expect(screen.getByText('Skipped for now')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open incident triage' }));
    expect(onRecommendedAction).toHaveBeenCalledTimes(1);
  });
});
