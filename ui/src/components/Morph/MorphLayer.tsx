import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { StepSummary } from '../../types';

export type Rect = { left: number; top: number; width: number; height: number };

type MorphLayerProps = {
  steps: StepSummary[];
  fromRects: Record<string, Rect>;
  toRects: Record<string, Rect>;
  onComplete: () => void;
};

export default function MorphLayer({ steps, fromRects, toRects, onComplete }: MorphLayerProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 550);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="morph-layer">
      {steps.map((step) => {
        const from = fromRects[step.id];
        const to = toRects[step.id];
        if (!from || !to) return null;
        return (
          <motion.div
            key={step.id}
            className={`morph-card step-${step.type}`}
            initial={{
              left: from.left,
              top: from.top,
              width: from.width,
              height: from.height,
            }}
            animate={{
              left: to.left,
              top: to.top,
              width: to.width,
              height: to.height,
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <div className="morph-card-title">{step.name}</div>
            <div className="morph-card-subtitle">{step.preview?.title ?? step.type}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
