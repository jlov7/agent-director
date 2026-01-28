import type { StepSummary } from '../../types';
import { buildDensity } from '../../utils/density';

const MIN_SPAN = 5000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
}: MiniTimelineProps) {
  const { buckets, wallTimeMs } = buildDensity(traceStart, traceEnd, steps, 64);
  const maxBucket = Math.max(1, ...buckets);
  const safeSpan = clamp(spanMs, MIN_SPAN, Math.max(MIN_SPAN, wallTimeMs));
  const rangeStart = windowRange?.startMs ?? 0;
  const rangeEnd = windowRange?.endMs ?? wallTimeMs;

  const windowLeft = wallTimeMs ? (rangeStart / wallTimeMs) * 100 : 0;
  const windowWidth = wallTimeMs ? ((rangeEnd - rangeStart) / wallTimeMs) * 100 : 100;
  const playheadLeft = wallTimeMs ? (playheadMs / wallTimeMs) * 100 : 0;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const next = clamp(Math.round(ratio * wallTimeMs), 0, wallTimeMs);
    onScrub(next);
  };

  return (
    <div className="mini-timeline">
      <div className="mini-track" onClick={handleClick} role="presentation">
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
      </div>
    </div>
  );
}
