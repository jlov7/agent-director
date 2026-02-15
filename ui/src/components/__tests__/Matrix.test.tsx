import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Matrix, { type MatrixScenarioDraft } from '../Matrix';
import type { ReplayJob, ReplayMatrix, StepSummary } from '../../types';

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
  {
    id: 's2',
    index: 1,
    type: 'tool_call',
    name: 'Search',
    startedAt: '2026-01-27T10:00:02.000Z',
    endedAt: '2026-01-27T10:00:03.000Z',
    status: 'completed',
    childStepIds: [],
  },
];

const scenarios: MatrixScenarioDraft[] = [
  { id: 'scn-1', name: 'Prompt tweak', strategy: 'hybrid', modificationsText: '{"prompt":"shorter"}' },
];

const job: ReplayJob = {
  id: 'job-1',
  traceId: 'trace-1',
  stepId: 's1',
  status: 'completed',
  createdAt: '2026-02-15T08:00:00Z',
  scenarioCount: 1,
  completedCount: 1,
  failedCount: 0,
  canceledCount: 0,
  scenarios: [],
};

const matrix: ReplayMatrix = {
  jobId: 'job-1',
  traceId: 'trace-1',
  stepId: 's1',
  rows: [
    {
      scenarioId: 'scn-1',
      name: 'Prompt tweak',
      strategy: 'hybrid',
      status: 'completed',
      replayTraceId: 'replay-1',
      modifications: { prompt: 'shorter' },
      changedStepIds: ['s1'],
      addedStepIds: [],
      removedStepIds: [],
      metrics: {
        costDeltaUsd: -0.01,
        wallTimeDeltaMs: -200,
        errorDelta: 0,
        retryDelta: 0,
        changedSteps: 1,
        addedSteps: 0,
        removedSteps: 0,
        invalidatedStepCount: 0,
      },
    },
    {
      scenarioId: 'scn-2',
      name: 'Latency spike',
      strategy: 'recorded',
      status: 'completed',
      replayTraceId: 'replay-2',
      modifications: { note: 'latency' },
      changedStepIds: ['s2'],
      addedStepIds: [],
      removedStepIds: [],
      metrics: {
        costDeltaUsd: 0.02,
        wallTimeDeltaMs: 500,
        errorDelta: 1,
        retryDelta: 0,
        changedSteps: 2,
        addedSteps: 0,
        removedSteps: 0,
        invalidatedStepCount: 1,
      },
    },
  ],
  causalRanking: [
    {
      factor: 'prompt',
      score: -0.2,
      confidence: 0.8,
      evidence: { samples: 2, examples: ['prompt=shorter'], positive: 0, negative: 2 },
    },
  ],
};

describe('Matrix', () => {
  it('renders scenario drafts and anchor selector', () => {
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={vi.fn()}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={matrix}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    expect(screen.getByText('Counterfactual Replay Matrix')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Prompt tweak')).toBeInTheDocument();
    expect(screen.getByLabelText('Anchor step')).toHaveValue('s1');
  });

  it('calls onRun with parsed scenarios when Run matrix is clicked', () => {
    const onRun = vi.fn();
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={onRun}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={null}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run matrix' }));
    expect(onRun).toHaveBeenCalledWith([
      { name: 'Prompt tweak', strategy: 'hybrid', modifications: { prompt: 'shorter' } },
    ]);
  });

  it('sorts by scenario name when header is clicked', () => {
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={vi.fn()}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={matrix}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Scenario' }));
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText('Latency spike')).toBeInTheDocument();
  });

  it('renders causal ranking evidence chips', () => {
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={vi.fn()}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={matrix}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    expect(screen.getByText('prompt')).toBeInTheDocument();
    expect(screen.getByText('prompt=shorter')).toBeInTheDocument();
  });

  it('blocks run when scenario JSON is invalid', () => {
    const onRun = vi.fn();
    const broken: MatrixScenarioDraft[] = [
      { id: 'scn-1', name: 'Broken', strategy: 'hybrid', modificationsText: '{' },
    ];
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={broken}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={onRun}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={null}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    expect(screen.getByText('Fix scenario errors before running.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run matrix' }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('opens details drawer with changed steps', () => {
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={vi.fn()}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={matrix}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
    expect(screen.getByText('Scenario details')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('shows error banner when error present', () => {
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={vi.fn()}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error="Failed to run replay matrix."
        job={job}
        matrix={matrix}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to run replay matrix.')).toBeInTheDocument();
  });

  it('offers scenario workbench controls for duplicate and ordering', () => {
    render(
      <Matrix
        steps={steps}
        anchorStepId="s1"
        onAnchorStepChange={vi.fn()}
        scenarios={scenarios}
        onScenarioChange={vi.fn()}
        onDuplicateScenario={vi.fn()}
        onMoveScenario={vi.fn()}
        onAddScenario={vi.fn()}
        onRemoveScenario={vi.fn()}
        onRun={vi.fn()}
        onCancel={vi.fn()}
        onReplaceScenarios={vi.fn()}
        loading={false}
        error={null}
        job={job}
        matrix={matrix}
        safeExport={false}
        onOpenCompare={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Duplicate scenario' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move scenario up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move scenario down' })).toBeInTheDocument();
  });
});
