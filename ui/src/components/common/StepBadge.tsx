import type { StepType } from '../../types';
import { getStepTypeMeta } from '../../utils/stepTypeMeta';

type StepBadgeProps = {
  type: StepType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
};

export default function StepBadge({ type, size = 'sm', showLabel = false }: StepBadgeProps) {
  const meta = getStepTypeMeta(type);
  return (
    <span className={`step-badge step-badge-${type} step-badge-${size}`} title={meta.description}>
      <span className="step-badge-icon">{meta.icon}</span>
      {showLabel ? <span className="step-badge-label">{meta.label}</span> : null}
    </span>
  );
}
