import type { NodeProps } from 'reactflow';
import type { StepSummary } from '../../types';
import { stepCostLabel } from '../../utils/insights';
import StepBadge from '../common/StepBadge';

export type StepNodeData = {
  step: StepSummary;
  diffStatus?: 'changed' | 'removed' | 'added' | null;
  ghost?: boolean;
};

export function StepNode({ data }: NodeProps<StepNodeData>) {
  const step = data.step;
  const costLabel = stepCostLabel(step);
  const diffClass = data.diffStatus ? `diff-${data.diffStatus}` : '';
  const ghostClass = data.ghost ? 'ghost-node' : '';
  const typeLabel = step.type.replace('_', ' ').toUpperCase();
  const tokenLabel = step.metrics?.tokensTotal != null ? `${step.metrics.tokensTotal} tokens` : null;
  const durationLabel = step.durationMs != null ? `${step.durationMs}ms` : null;
  const helpBits = [tokenLabel, durationLabel, costLabel].filter(Boolean).join(' · ');
  const helpBody = `Click to inspect or replay this step.${helpBits ? ` ${helpBits}.` : ''}`;
  return (
    <div
      className={`flow-node step-${step.type} ${diffClass} ${ghostClass}`}
      data-help
      data-help-title={`${step.name} · ${typeLabel}`}
      data-help-body={helpBody}
      data-help-placement="right"
    >
      <div className="flow-node-header">
        <div className="flow-node-title">
          <StepBadge type={step.type} />
          <span>{step.name}</span>
        </div>
        <span className={`status-pill status-${step.status}`}>{step.status}</span>
      </div>
      <div className="flow-node-preview">{step.preview?.outputPreview ?? step.preview?.inputPreview}</div>
      <div className="flow-node-metrics">
        {step.metrics?.tokensTotal != null ? <span>{step.metrics.tokensTotal} tok</span> : null}
        {step.durationMs != null ? <span>{step.durationMs}ms</span> : null}
        {costLabel ? <span>{costLabel}</span> : null}
      </div>
    </div>
  );
}

export const nodeTypes = {
  stepNode: StepNode,
};
