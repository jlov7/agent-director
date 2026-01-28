import type { ReactNode } from 'react';
import type { StepSummary } from '../../types';
import MorphLayer, { type Rect } from './MorphLayer';

type MorphState = {
  steps: StepSummary[];
  fromRects: Record<string, Rect>;
  toRects: Record<string, Rect>;
};

type MorphOrchestratorProps = {
  morph: MorphState | null;
  onComplete: () => void;
  children: ReactNode;
};

export default function MorphOrchestrator({ morph, onComplete, children }: MorphOrchestratorProps) {
  return (
    <div className="morph-orchestrator">
      {children}
      {morph ? (
        <MorphLayer steps={morph.steps} fromRects={morph.fromRects} toRects={morph.toRects} onComplete={onComplete} />
      ) : null}
    </div>
  );
}
