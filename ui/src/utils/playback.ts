import type { StepInterval } from './timingUtils';

export type PlaybackState = 'future' | 'active' | 'past';

export function derivePlaybackState(interval: StepInterval, playheadMs: number): PlaybackState {
  if (playheadMs < interval.startMs) return 'future';
  if (playheadMs > interval.endMs) return 'past';
  return 'active';
}
