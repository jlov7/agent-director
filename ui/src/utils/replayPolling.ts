const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 2000;
const BACKOFF_FACTOR = 1.5;

export function computePollDelay(attempt: number) {
  const delay = BASE_DELAY_MS * Math.pow(BACKOFF_FACTOR, Math.max(0, attempt));
  return Math.min(MAX_DELAY_MS, Math.round(delay));
}
