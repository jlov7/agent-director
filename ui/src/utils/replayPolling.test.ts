import { describe, it, expect } from 'vitest';
import { computePollDelay } from './replayPolling';

describe('computePollDelay', () => {
  it('increases delay with attempt count and caps at max', () => {
    const first = computePollDelay(0);
    const second = computePollDelay(1);
    const later = computePollDelay(5);
    const capped = computePollDelay(20);

    expect(first).toBe(300);
    expect(second).toBeGreaterThan(first);
    expect(later).toBeGreaterThan(second);
    expect(capped).toBe(2000);
  });
});
