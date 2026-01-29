import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type TourStep = {
  id: string;
  title: string;
  body: string;
  target: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

type GuidedTourProps = {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function GuidedTour({ steps, open, onClose, onComplete }: GuidedTourProps) {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  const step = useMemo(() => steps[index], [steps, index]);

  const updateTarget = useCallback(() => {
    if (!open) return;
    const element = document.querySelector(step.target) as HTMLElement | null;
    if (!element) {
      activeTargetRef.current = null;
      setTargetRect(null);
      return;
    }
    activeTargetRef.current = element;
    const rect = element.getBoundingClientRect();
    setTargetRect(rect);
  }, [open, step.target]);

  const updateCardPosition = useCallback(() => {
    if (!targetRect || !cardRef.current) {
      setCardPos(null);
      return;
    }
    const cardWidth = cardRef.current.offsetWidth;
    const cardHeight = cardRef.current.offsetHeight;
    const margin = 16;

    let left = clamp(targetRect.left + targetRect.width / 2 - cardWidth / 2, margin, window.innerWidth - cardWidth - margin);
    let top = targetRect.bottom + 16;

    if (step.placement === 'top') {
      top = targetRect.top - cardHeight - 16;
    }
    if (step.placement === 'left') {
      left = targetRect.left - cardWidth - 16;
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
    }
    if (step.placement === 'right') {
      left = targetRect.right + 16;
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
    }

    if (top + cardHeight > window.innerHeight - margin) {
      top = targetRect.top - cardHeight - 16;
    }
    if (top < margin) {
      top = targetRect.bottom + 16;
    }

    left = clamp(left, margin, window.innerWidth - cardWidth - margin);
    top = clamp(top, margin, window.innerHeight - cardHeight - margin);

    setCardPos({ top, left });
  }, [step.placement, targetRect]);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const element = document.querySelector(step.target) as HTMLElement | null;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
    const frame = window.requestAnimationFrame(() => updateTarget());
    return () => window.cancelAnimationFrame(frame);
  }, [open, step.target, updateTarget]);

  useLayoutEffect(() => {
    updateCardPosition();
  }, [targetRect, updateCardPosition, step.title]);

  useEffect(() => {
    if (!open) return;
    const handle = () => {
      updateTarget();
      updateCardPosition();
    };
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, updateTarget, updateCardPosition]);

  if (!open || !step) return null;

  const highlightStyle = targetRect
    ? {
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : undefined;

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div className="tour-backdrop" onClick={onClose} />
      {targetRect ? <div className="tour-spotlight" style={highlightStyle} /> : null}
      <div
        className={`tour-card ${cardPos ? 'tour-card-anchored' : ''}`}
        ref={cardRef}
        style={cardPos ?? undefined}
      >
        <div className="tour-step">Step {index + 1} of {steps.length}</div>
        <div className="tour-title">{step.title}</div>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            disabled={index === 0}
          >
            Back
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Skip
          </button>
          {index === steps.length - 1 ? (
            <button className="primary-button" type="button" onClick={onComplete}>
              Finish tour
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={() => setIndex((prev) => prev + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
