import type { StepSummary, TraceSummary } from '../../types';
import TimestampTimeline from './TimestampTimeline';

type CinemaModeProps = {
  trace: TraceSummary;
  steps: StepSummary[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  playheadMs: number;
  windowRange?: { startMs: number; endMs: number } | null;
  timing?: { degraded: boolean; issues: string[] };
  ghostTrace?: TraceSummary | null;
  diff?: {
    addedSteps: string[];
    removedSteps: string[];
    changedSteps: string[];
    changedPairs?: Array<{ leftId: string; rightId: string }>;
  } | null;
};

export default function CinemaMode({
  trace,
  steps,
  selectedStepId,
  onSelectStep,
  playheadMs,
  windowRange,
  timing,
  ghostTrace,
  diff,
}: CinemaModeProps) {
  const wallTimeMs = trace.metadata.wallTimeMs || 1;
  const playheadPct = Math.min(100, Math.max(0, (playheadMs / wallTimeMs) * 100));
  return (
    <section className="cinema-mode" aria-label="Cinema mode">
      {timing?.degraded ? (
        <div className="timing-banner" title={timing.issues.join(' ')}>
          Timing degraded: {timing.issues[0] ?? 'Check timestamps.'}
        </div>
      ) : null}
      <TimestampTimeline
        trace={trace}
        steps={steps}
        selectedStepId={selectedStepId}
        onSelectStep={onSelectStep}
        playheadPct={playheadPct}
        playheadMs={playheadMs}
        windowRange={windowRange}
        ghostTrace={ghostTrace}
        diff={diff}
      />
    </section>
  );
}
