import type { CSSProperties } from 'react';
import type { StepSummary, TraceSummary } from '../../types';
import { buildIntervals } from '../../utils/timingUtils';
import StepCard from './StepCard';
import { derivePlaybackState } from '../../utils/playback';

const LANE_HEIGHT = 140;
const CARD_HEIGHT = 132;
const COMPACT_HEIGHT = 96;

const typeOrder: Record<string, number> = {
  llm_call: 1,
  tool_call: 2,
  decision: 3,
  handoff: 4,
  guardrail: 5,
};

function sortSteps(steps: StepSummary[]) {
  return [...steps].sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9));
}

type TimestampTimelineProps = {
  trace: TraceSummary;
  steps: StepSummary[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  playheadPct: number;
  playheadMs: number;
  windowRange?: { startMs: number; endMs: number } | null;
  ghostTrace?: TraceSummary | null;
  diff?: {
    addedSteps: string[];
    removedSteps: string[];
    changedSteps: string[];
    changedPairs?: Array<{ leftId: string; rightId: string }>;
  } | null;
  laneHeight?: number;
  cardHeight?: number;
  compactHeight?: number;
};

export default function TimestampTimeline({
  trace,
  steps,
  selectedStepId,
  onSelectStep,
  playheadPct,
  playheadMs,
  windowRange,
  ghostTrace,
  diff,
  laneHeight = LANE_HEIGHT,
  cardHeight = CARD_HEIGHT,
  compactHeight = COMPACT_HEIGHT,
}: TimestampTimelineProps) {
  const { intervals, laneCount } = buildIntervals(trace.startedAt, trace.endedAt, steps);
  const intervalMap = new Map(intervals.map((interval) => [interval.stepId, interval]));
  const sortedSteps = sortSteps(steps);
  const baseWallTimeMs = trace.metadata.wallTimeMs || 1;

  const diffRemoved = new Set(diff?.removedSteps ?? []);
  const diffChangedLeft = new Set(diff?.changedSteps ?? []);
  const diffChangedRight = new Set((diff?.changedPairs ?? []).map((pair) => pair.rightId));
  const diffAdded = new Set(diff?.addedSteps ?? []);

  let visibleIntervals = intervals;
  if (windowRange) {
    const span = windowRange.endMs - windowRange.startMs;
    const overscan = Math.max(1000, span * 0.15);
    const rangeStart = Math.max(0, windowRange.startMs - overscan);
    const rangeEnd = windowRange.endMs + overscan;
    visibleIntervals = intervals.filter(
      (interval) => interval.endMs >= rangeStart && interval.startMs <= rangeEnd
    );
    if (selectedStepId && !visibleIntervals.some((interval) => interval.stepId === selectedStepId)) {
      const selected = intervalMap.get(selectedStepId);
      if (selected) visibleIntervals = [...visibleIntervals, selected];
    }
  }

  const visibleStepIds = new Set(visibleIntervals.map((interval) => interval.stepId));

  return (
    <div
      className="timeline"
      style={
        {
          '--step-card-height': `${cardHeight}px`,
          '--step-compact-height': `${compactHeight}px`,
        } as CSSProperties
      }
    >
      <div
        className="timeline-grid"
        style={{ height: `${laneCount * laneHeight}px` }}
        data-help
        data-help-title="Timeline lanes"
        data-help-body="Each lane stacks overlapping steps; width reflects duration."
        data-help-placement="top"
      >
        <div className="playback-cursor" style={{ left: `${playheadPct}%` }} />
        {sortedSteps
          .filter((step) => visibleStepIds.has(step.id))
          .map((step) => {
          const interval = intervalMap.get(step.id);
          if (!interval) return null;
          const playbackState = derivePlaybackState(interval, playheadMs);
          return (
            <StepCard
              key={step.id}
              step={step}
              interval={interval}
              playbackState={playbackState}
              selected={selectedStepId === step.id}
              diffStatus={
                diffRemoved.has(step.id) ? 'removed' : diffChangedLeft.has(step.id) ? 'changed' : null
              }
              laneHeight={laneHeight}
              onSelect={onSelectStep}
            />
          );
        })}
        {ghostTrace ? (
          <GhostOverlay
            ghostTrace={ghostTrace}
            baseWallTimeMs={baseWallTimeMs}
            playheadMs={playheadMs}
            windowRange={windowRange}
            diffAdded={diffAdded}
            diffChanged={diffChangedRight}
            laneHeight={laneHeight}
          />
        ) : null}
      </div>
    </div>
  );
}

function GhostOverlay({
  ghostTrace,
  baseWallTimeMs,
  playheadMs,
  windowRange,
  diffAdded,
  diffChanged,
  laneHeight,
}: {
  ghostTrace: TraceSummary;
  baseWallTimeMs: number;
  playheadMs: number;
  windowRange?: { startMs: number; endMs: number } | null;
  diffAdded: Set<string>;
  diffChanged: Set<string>;
  laneHeight: number;
}) {
  const { intervals, laneCount } = buildIntervals(ghostTrace.startedAt, ghostTrace.endedAt, ghostTrace.steps);
  const intervalMap = new Map(intervals.map((interval) => [interval.stepId, interval]));
  const ghostWallTimeMs = ghostTrace.metadata.wallTimeMs || 1;
  const ghostPlayheadMs = (playheadMs / baseWallTimeMs) * ghostWallTimeMs;

  let visibleIntervals = intervals;
  if (windowRange) {
    const span = windowRange.endMs - windowRange.startMs;
    const overscan = Math.max(1000, span * 0.15);
    const ratio = ghostWallTimeMs / baseWallTimeMs;
    const rangeStart = Math.max(0, (windowRange.startMs - overscan) * ratio);
    const rangeEnd = Math.min(ghostWallTimeMs, (windowRange.endMs + overscan) * ratio);
    visibleIntervals = intervals.filter(
      (interval) => interval.endMs >= rangeStart && interval.startMs <= rangeEnd
    );
  }

  const visibleStepIds = new Set(visibleIntervals.map((interval) => interval.stepId));
  const sortedGhostSteps = sortSteps(ghostTrace.steps);

  return (
    <>
      <div className="ghost-lanes" style={{ height: `${laneCount * laneHeight}px` }} />
      {sortedGhostSteps
        .filter((step) => visibleStepIds.has(step.id))
        .map((step) => {
          const interval = intervalMap.get(step.id);
          if (!interval) return null;
          const playbackState = derivePlaybackState(interval, ghostPlayheadMs);
          const diffStatus = diffAdded.has(step.id) ? 'added' : diffChanged.has(step.id) ? 'changed' : null;
          return (
            <StepCard
              key={`ghost-${step.id}`}
              step={step}
              interval={interval}
              playbackState={playbackState}
              selected={false}
              diffStatus={diffStatus}
              variant="ghost"
              disabled
              laneHeight={laneHeight}
              onSelect={() => undefined}
            />
          );
        })}
    </>
  );
}
