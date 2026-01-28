import type { StepSummary, TraceSummary } from '../../types';
import FlowCanvas from './FlowCanvas';

type FlowModeProps = {
  steps: StepSummary[];
  onSelectStep: (stepId: string) => void;
  selectedStepId?: string | null;
  baseTrace: TraceSummary;
  compareTrace?: TraceSummary | null;
  compareSteps?: StepSummary[];
  overlayEnabled: boolean;
  onToggleOverlay: () => void;
};

export default function FlowMode({
  steps,
  onSelectStep,
  selectedStepId,
  baseTrace,
  compareTrace,
  compareSteps,
  overlayEnabled,
  onToggleOverlay,
}: FlowModeProps) {
  return (
    <section className="flow-mode-wrapper" aria-label="Flow mode">
      <FlowCanvas
        steps={steps}
        selectedStepId={selectedStepId}
        onSelectStep={onSelectStep}
        baseTrace={baseTrace}
        compareTrace={compareTrace}
        compareSteps={compareSteps}
        overlayEnabled={overlayEnabled}
        onToggleOverlay={onToggleOverlay}
      />
    </section>
  );
}
