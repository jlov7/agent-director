import { describe, expect, it } from 'vitest';
import { computeTimeToFirstSuccessMs, pruneToWindow, shouldTriggerRageClick } from './usabilitySignals';

describe('usabilitySignals', () => {
  it('prunes timestamps outside the rolling window', () => {
    expect(pruneToWindow([100, 200, 300], 450, 180)).toEqual([300]);
  });

  it('detects rage clicks at threshold', () => {
    expect(shouldTriggerRageClick([1, 2, 3], 4)).toBe(false);
    expect(shouldTriggerRageClick([1, 2, 3, 4], 4)).toBe(true);
  });

  it('computes time to first success as non-negative', () => {
    expect(computeTimeToFirstSuccessMs(1_000, 1_450)).toBe(450);
    expect(computeTimeToFirstSuccessMs(1_000, 900)).toBe(0);
  });
});
