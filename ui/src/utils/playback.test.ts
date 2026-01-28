import { derivePlaybackState } from './playback';

const interval = { stepId: 's1', startMs: 100, endMs: 200, lane: 0, xPct: 0, wPct: 0 };

test('marks future when playhead before start', () => {
  expect(derivePlaybackState(interval, 50)).toBe('future');
});

test('marks active when playhead within interval', () => {
  expect(derivePlaybackState(interval, 150)).toBe('active');
});

test('marks past when playhead after end', () => {
  expect(derivePlaybackState(interval, 250)).toBe('past');
});
