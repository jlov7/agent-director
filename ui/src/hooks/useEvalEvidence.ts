import { useCallback, useEffect, useState } from 'react';
import type { EvalCase, EvalRun, TraceSummary } from '../types';
import { createEvalCaseFromTrace, fetchEvalCases, runEvalCases } from '../store/api';

type TrackEvalEvent = (action: 'create_case' | 'run_suite', metadata: Record<string, unknown>) => void;

export function useEvalEvidence(trace: TraceSummary | null, trackEvalEvent: TrackEvalEvent) {
  const [evalCases, setEvalCases] = useState<EvalCase[]>([]);
  const [evalRun, setEvalRun] = useState<EvalRun | null>(null);
  const [evalBusy, setEvalBusy] = useState(false);
  const [evalStatus, setEvalStatus] = useState<string | null>(null);

  const refreshEvalCases = useCallback(async () => {
    const cases = await fetchEvalCases();
    setEvalCases(cases);
  }, []);

  useEffect(() => {
    void refreshEvalCases();
  }, [refreshEvalCases, trace?.id]);

  const createEvalCaseForActiveTrace = useCallback(async () => {
    if (!trace?.id) return;
    setEvalBusy(true);
    try {
      const failedStep = trace.steps.find((step) => step.status === 'failed');
      const evaluators = failedStep?.error
        ? [
            {
              type: 'text_contains',
              name: 'Error signature',
              step_id: failedStep.id,
              field: 'error',
              expected: failedStep.error,
            },
          ]
        : [];
      const created = await createEvalCaseFromTrace(trace.id, failedStep?.id, undefined, evaluators);
      setEvalStatus(created ? `Created eval case ${created.name}.` : 'Eval case creation failed.');
      await refreshEvalCases();
      trackEvalEvent('create_case', { traceId: trace.id });
    } finally {
      setEvalBusy(false);
    }
  }, [refreshEvalCases, trace, trackEvalEvent]);

  const runCurrentEvalSuite = useCallback(async () => {
    setEvalBusy(true);
    try {
      const run = await runEvalCases(evalCases.map((evalCase) => evalCase.id));
      setEvalRun(run);
      setEvalStatus(run ? `Eval run ${run.status}.` : 'Eval run failed.');
      trackEvalEvent('run_suite', { status: run?.status ?? 'failed' });
    } finally {
      setEvalBusy(false);
    }
  }, [evalCases, trackEvalEvent]);

  return {
    evalCases,
    evalRun,
    evalBusy,
    evalStatus,
    createEvalCaseForActiveTrace,
    runCurrentEvalSuite,
  };
}
