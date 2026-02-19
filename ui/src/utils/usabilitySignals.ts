export function pruneToWindow(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((value) => now - value <= windowMs);
}

export function shouldTriggerRageClick(timestamps: number[], threshold = 4): boolean {
  return timestamps.length >= threshold;
}

export function computeTimeToFirstSuccessMs(sessionStartedAtMs: number, successAtMs: number): number {
  return Math.max(0, successAtMs - sessionStartedAtMs);
}
