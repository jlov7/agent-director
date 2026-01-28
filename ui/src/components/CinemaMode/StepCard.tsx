import type { StepSummary } from '../../types';
import { stepCostLabel } from '../../utils/insights';
import type { StepInterval } from '../../utils/timingUtils';
import StepBadge from '../common/StepBadge';

type StepCardProps = {
  step: StepSummary;
  interval: StepInterval;
  playbackState: 'future' | 'active' | 'past';
  selected: boolean;
  onSelect: (stepId: string) => void;
  variant?: 'base' | 'ghost';
  diffStatus?: 'changed' | 'added' | 'removed' | null;
  disabled?: boolean;
};

export default function StepCard({
  step,
  interval,
  playbackState,
  selected,
  onSelect,
  variant = 'base',
  diffStatus,
  disabled = false,
}: StepCardProps) {
  const costLabel = stepCostLabel(step);
  const subtitle = step.preview?.subtitle ?? step.preview?.title ?? '';
  const preview = step.preview?.outputPreview ?? step.preview?.inputPreview ?? '';
  const diffClass = diffStatus ? `step-diff-${diffStatus}` : '';
  const variantClass = variant === 'ghost' ? 'step-ghost' : '';
  return (
    <button
      type="button"
      className={`step-card step-${step.type} step-${playbackState} ${selected ? 'step-selected' : ''} ${diffClass} ${variantClass}`}
      data-step-id={step.id}
      aria-label={`${step.name} (${step.type})`}
      aria-pressed={selected}
      aria-hidden={variant === 'ghost'}
      disabled={disabled}
      style={{
        left: `${interval.xPct}%`,
        width: `${interval.wPct}%`,
        top: `${interval.lane * 140}px`,
      }}
      onClick={() => {
        if (disabled) return;
        onSelect(step.id);
      }}
    >
      <div className="step-card-header">
        <div className="step-title-group">
          <StepBadge type={step.type} />
          <span className="step-title">{step.name}</span>
        </div>
        <span className={`status-pill status-${step.status}`}>{step.status}</span>
      </div>
      {subtitle ? <div className="step-subtitle">{subtitle}</div> : null}
      <div className="step-metrics">
        {step.metrics?.tokensTotal != null ? <span>{step.metrics.tokensTotal} tok</span> : null}
        {step.durationMs != null ? <span>{step.durationMs}ms</span> : null}
        {costLabel ? <span>{costLabel}</span> : null}
      </div>
      {preview ? <div className="step-preview">{preview}</div> : null}
    </button>
  );
}
