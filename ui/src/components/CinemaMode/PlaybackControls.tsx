import type { ChangeEvent } from 'react';

const speeds = [0.5, 1, 1.5, 2, 4];

type PlaybackControlsProps = {
  playheadMs: number;
  wallTimeMs: number;
  isPlaying: boolean;
  speed: number;
  onToggle: () => void;
  onScrub: (value: number) => void;
  onSpeedChange: (value: number) => void;
};

export default function PlaybackControls({
  playheadMs,
  wallTimeMs,
  isPlaying,
  speed,
  onToggle,
  onScrub,
  onSpeedChange,
}: PlaybackControlsProps) {
  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
    onScrub(Number(event.target.value));
  };

  return (
    <div className="playback-controls">
      <button
        className="ghost-button"
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
        data-help
        data-help-title="Playhead"
        data-help-body="Start or pause the run to experience timing as it unfolded."
        data-help-placement="bottom"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input
        className="playback-slider"
        type="range"
        min={0}
        max={wallTimeMs}
        value={playheadMs}
        aria-label="Playback position"
        onChange={handleScrub}
        data-help
        data-help-title="Scrub timeline"
        data-help-body="Drag to jump to any moment in the run."
        data-help-placement="bottom"
      />
      <select
        className="playback-speed"
        value={speed}
        aria-label="Playback speed"
        onChange={(event) => onSpeedChange(Number(event.target.value))}
        data-help
        data-help-title="Speed"
        data-help-body="Slow down to inspect or speed up to skim."
        data-help-placement="bottom"
      >
        {speeds.map((value) => (
          <option key={value} value={value}>
            {value}x
          </option>
        ))}
      </select>
    </div>
  );
}
