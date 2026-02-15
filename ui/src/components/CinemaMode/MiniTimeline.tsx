import type { StepSummary } from '../../types';
import { buildDensity } from '../../utils/density';
import { downloadJson } from '../../utils/export';
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';

const MIN_SPAN = 5000;
const MAX_BOOKMARKS = 32;

type TimelineStudioState = {
  bookmarksMs: number[];
  clipStartMs: number | null;
  clipEndMs: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBookmarks(values: number[], wallTimeMs: number) {
  const unique = new Set<number>();
  values.forEach((value) => {
    unique.add(clamp(Math.round(value), 0, wallTimeMs));
  });
  return Array.from(unique)
    .sort((a, b) => a - b)
    .slice(0, MAX_BOOKMARKS);
}

function parseStudioState(raw: string | null, wallTimeMs: number): TimelineStudioState {
  if (!raw) return { bookmarksMs: [], clipStartMs: null, clipEndMs: null };
  try {
    const parsed = JSON.parse(raw) as Partial<TimelineStudioState>;
    const bookmarksMs = normalizeBookmarks(Array.isArray(parsed.bookmarksMs) ? parsed.bookmarksMs : [], wallTimeMs);
    const clipStartMs = typeof parsed.clipStartMs === 'number' ? clamp(parsed.clipStartMs, 0, wallTimeMs) : null;
    const clipEndMs = typeof parsed.clipEndMs === 'number' ? clamp(parsed.clipEndMs, 0, wallTimeMs) : null;
    return {
      bookmarksMs,
      clipStartMs,
      clipEndMs: clipStartMs != null && clipEndMs != null && clipEndMs < clipStartMs ? clipStartMs : clipEndMs,
    };
  } catch {
    return { bookmarksMs: [], clipStartMs: null, clipEndMs: null };
  }
}

function toIsoTimestamp(traceStart: string, offsetMs: number) {
  const startMs = Date.parse(traceStart);
  if (Number.isNaN(startMs)) return null;
  return new Date(startMs + offsetMs).toISOString();
}

type MiniTimelineProps = {
  traceStart: string;
  traceEnd: string | null;
  steps: StepSummary[];
  playheadMs: number;
  windowRange: { startMs: number; endMs: number } | null;
  windowed: boolean;
  spanMs: number;
  onSpanChange: (value: number) => void;
  onToggleWindowed: (value: boolean) => void;
  onScrub: (value: number) => void;
  persistenceKey?: string;
};

export default function MiniTimeline({
  traceStart,
  traceEnd,
  steps,
  playheadMs,
  windowRange,
  windowed,
  spanMs,
  onSpanChange,
  onToggleWindowed,
  onScrub,
  persistenceKey,
}: MiniTimelineProps) {
  const { buckets, wallTimeMs } = buildDensity(traceStart, traceEnd, steps, 64);
  const maxBucket = Math.max(1, ...buckets);
  const safeSpan = clamp(spanMs, MIN_SPAN, Math.max(MIN_SPAN, wallTimeMs));
  const rangeStart = windowRange?.startMs ?? 0;
  const rangeEnd = windowRange?.endMs ?? wallTimeMs;
  const storageKey = useMemo(
    () => `agentDirector.timelineStudio.${persistenceKey ?? traceStart}`,
    [persistenceKey, traceStart]
  );
  const [bookmarksMs, setBookmarksMs] = useState<number[]>([]);
  const [clipStartMs, setClipStartMs] = useState<number | null>(null);
  const [clipEndMs, setClipEndMs] = useState<number | null>(null);

  useEffect(() => {
    const state = parseStudioState(window.localStorage.getItem(storageKey), wallTimeMs);
    setBookmarksMs(state.bookmarksMs);
    setClipStartMs(state.clipStartMs);
    setClipEndMs(state.clipEndMs);
  }, [storageKey, wallTimeMs]);

  useEffect(() => {
    const payload: TimelineStudioState = {
      bookmarksMs: normalizeBookmarks(bookmarksMs, wallTimeMs),
      clipStartMs: clipStartMs == null ? null : clamp(clipStartMs, 0, wallTimeMs),
      clipEndMs: clipEndMs == null ? null : clamp(clipEndMs, 0, wallTimeMs),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [bookmarksMs, clipEndMs, clipStartMs, storageKey, wallTimeMs]);

  const windowLeft = wallTimeMs ? (rangeStart / wallTimeMs) * 100 : 0;
  const windowWidth = wallTimeMs ? ((rangeEnd - rangeStart) / wallTimeMs) * 100 : 100;
  const playheadLeft = wallTimeMs ? (playheadMs / wallTimeMs) * 100 : 0;
  const clipFromMs = clipStartMs != null && clipEndMs != null ? Math.min(clipStartMs, clipEndMs) : null;
  const clipToMs = clipStartMs != null && clipEndMs != null ? Math.max(clipStartMs, clipEndMs) : null;
  const clipWidthPct = clipFromMs != null && clipToMs != null && wallTimeMs
    ? ((clipToMs - clipFromMs) / wallTimeMs) * 100
    : 0;
  const clipLeftPct = clipFromMs != null && wallTimeMs ? (clipFromMs / wallTimeMs) * 100 : 0;
  const hasValidClip = clipFromMs != null && clipToMs != null && clipToMs > clipFromMs;

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const next = clamp(Math.round(ratio * wallTimeMs), 0, wallTimeMs);
    onScrub(next);
  };

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onScrub(clamp(playheadMs - Math.max(250, Math.round(wallTimeMs * 0.02)), 0, wallTimeMs));
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onScrub(clamp(playheadMs + Math.max(250, Math.round(wallTimeMs * 0.02)), 0, wallTimeMs));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      onScrub(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      onScrub(wallTimeMs);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onScrub(playheadMs);
    }
  };

  const addBookmark = () => {
    setBookmarksMs((prev) => normalizeBookmarks([...prev, playheadMs], wallTimeMs));
  };

  const jumpBookmark = (direction: 'previous' | 'next') => {
    if (bookmarksMs.length === 0) return;
    const sorted = normalizeBookmarks(bookmarksMs, wallTimeMs);
    if (direction === 'previous') {
      const target = [...sorted].reverse().find((value) => value < playheadMs) ?? sorted[sorted.length - 1];
      onScrub(target);
      return;
    }
    const target = sorted.find((value) => value > playheadMs) ?? sorted[0];
    onScrub(target);
  };

  const setClipStart = () => {
    const nextStart = clamp(playheadMs, 0, wallTimeMs);
    setClipStartMs(nextStart);
    if (clipEndMs != null && clipEndMs < nextStart) {
      setClipEndMs(nextStart);
    }
  };

  const setClipEnd = () => {
    const nextEnd = clamp(playheadMs, 0, wallTimeMs);
    setClipEndMs(nextEnd);
    if (clipStartMs != null && clipStartMs > nextEnd) {
      setClipStartMs(nextEnd);
    }
  };

  const clearClip = () => {
    setClipStartMs(null);
    setClipEndMs(null);
  };

  const handleExportClip = () => {
    if (!hasValidClip || clipFromMs == null || clipToMs == null) return;
    const payload = {
      type: 'agent-director-clip',
      traceStart,
      traceEnd,
      clip: {
        startMs: clipFromMs,
        endMs: clipToMs,
        startAt: toIsoTimestamp(traceStart, clipFromMs),
        endAt: toIsoTimestamp(traceStart, clipToMs),
      },
      bookmarksMs: normalizeBookmarks(bookmarksMs, wallTimeMs).filter(
        (bookmark) => bookmark >= clipFromMs && bookmark <= clipToMs
      ),
      playheadMs,
      exportedAt: new Date().toISOString(),
    };
    downloadJson(`agent-director-clip-${clipFromMs}-${clipToMs}.json`, payload);
  };

  return (
    <div className="mini-timeline">
      <div
        className="mini-track"
        onClick={handleClick}
        role="slider"
        tabIndex={0}
        aria-label="Timeline density map"
        aria-valuemin={0}
        aria-valuemax={wallTimeMs}
        aria-valuenow={playheadMs}
        aria-valuetext={`${playheadMs} milliseconds`}
        onKeyDown={handleTrackKeyDown}
        data-help
        data-help-title="Density map"
        data-help-body="A compact view of activity density. Click to jump the playhead."
        data-help-placement="top"
      >
        <div className="mini-bars">
          {buckets.map((value, index) => (
            <span
              key={`bucket-${index}`}
              className="mini-bar"
              style={{ height: `${(value / maxBucket) * 100}%` }}
            />
          ))}
        </div>
        <div
          className="mini-window"
          style={{ left: `${windowLeft}%`, width: `${windowWidth}%`, opacity: windowed ? 1 : 0.4 }}
        />
        {hasValidClip ? (
          <div className="mini-clip-window" style={{ left: `${clipLeftPct}%`, width: `${clipWidthPct}%` }} />
        ) : null}
        <div className="mini-bookmark-markers" data-testid="timeline-bookmark-markers" aria-hidden="true">
          {normalizeBookmarks(bookmarksMs, wallTimeMs).map((bookmarkMs) => {
            const left = wallTimeMs ? (bookmarkMs / wallTimeMs) * 100 : 0;
            return (
              <button
                key={`bookmark-${bookmarkMs}`}
                type="button"
                className="mini-bookmark-marker"
                style={{ left: `${left}%` }}
                onClick={(event) => {
                  event.stopPropagation();
                  onScrub(bookmarkMs);
                }}
                title={`Jump to bookmark at ${bookmarkMs}ms`}
                aria-label={`Bookmark ${bookmarkMs} milliseconds`}
              />
            );
          })}
        </div>
        <div className="mini-playhead" style={{ left: `${playheadLeft}%` }} />
      </div>
      <div className="mini-controls">
        <label className="mini-label">Zoom</label>
        <input
          type="range"
          min={MIN_SPAN}
          max={Math.max(MIN_SPAN, wallTimeMs)}
          value={safeSpan}
          aria-label="Timeline zoom"
          onChange={(event) => {
            onToggleWindowed(true);
            onSpanChange(Number(event.target.value));
          }}
          data-help
          data-help-title="Zoom window"
          data-help-body="Tighten the window to focus on hotspots."
          data-help-placement="top"
        />
        <button
          className="ghost-button"
          type="button"
          onClick={() => onToggleWindowed(!windowed)}
          title="Toggle windowed playback"
        >
          {windowed ? 'Full' : 'Window'}
        </button>
        <button
          className="ghost-button"
          type="button"
          title="Reset zoom"
          onClick={() => {
            onToggleWindowed(true);
            onSpanChange(Math.min(Math.max(wallTimeMs * 0.2, MIN_SPAN), 60000));
          }}
        >
          Reset
        </button>
        <button className="ghost-button" type="button" onClick={addBookmark}>
          Add bookmark
        </button>
        <button className="ghost-button" type="button" onClick={() => jumpBookmark('previous')}>
          Previous bookmark
        </button>
        <button className="ghost-button" type="button" onClick={() => jumpBookmark('next')}>
          Next bookmark
        </button>
        <button className="ghost-button" type="button" onClick={setClipStart}>
          Set clip start
        </button>
        <button className="ghost-button" type="button" onClick={setClipEnd}>
          Set clip end
        </button>
        <button className="ghost-button" type="button" onClick={clearClip}>
          Clear clip
        </button>
        <button className="ghost-button" type="button" onClick={handleExportClip} disabled={!hasValidClip}>
          Export clip
        </button>
      </div>
    </div>
  );
}
