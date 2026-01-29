import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type HelpState = {
  rect: DOMRect;
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
};

type ContextHelpOverlayProps = {
  enabled: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function ContextHelpOverlay({ enabled }: ContextHelpOverlayProps) {
  const [active, setActive] = useState<HelpState | null>(null);
  const [bubblePos, setBubblePos] = useState<{ left: number; top: number } | null>(null);
  const activeEl = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const updateFromElement = useCallback(() => {
    const el = activeEl.current;
    if (!el) {
      setActive(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const title = el.dataset.helpTitle ?? 'Context';
    const body = el.dataset.helpBody ?? '';
    const placement = (el.dataset.helpPlacement as HelpState['placement']) ?? 'right';
    setActive({ rect, title, body, placement });
  }, []);

  useEffect(() => {
    if (!enabled) {
      activeEl.current = null;
      setActive(null);
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('[data-help]') as HTMLElement | null;
      if (!target) {
        if (!activeEl.current) {
          setActive(null);
        }
        return;
      }
      if (activeEl.current !== target) {
        activeEl.current = target;
        updateFromElement();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('[data-help]') as HTMLElement | null;
      if (!target) return;
      activeEl.current = target;
      updateFromElement();
    };

    const handleFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as HTMLElement | null;
      if (next?.closest?.('[data-help]')) return;
      activeEl.current = null;
      setActive(null);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('[data-help]') as HTMLElement | null;
      if (!target) {
        activeEl.current = null;
        setActive(null);
        return;
      }
      activeEl.current = target;
      updateFromElement();
    };

    const handleScroll = () => {
      if (!activeEl.current) return;
      updateFromElement();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [enabled, updateFromElement]);

  const updateBubblePosition = useCallback(() => {
    if (!active || !bubbleRef.current) {
      setBubblePos(null);
      return;
    }
    const margin = 12;
    const cardWidth = bubbleRef.current.offsetWidth;
    const cardHeight = bubbleRef.current.offsetHeight;
    const { rect, placement } = active;

    let left = rect.right + 16;
    let top = rect.top + rect.height / 2 - cardHeight / 2;

    if (placement === 'left') {
      left = rect.left - cardWidth - 16;
      top = rect.top + rect.height / 2 - cardHeight / 2;
    }
    if (placement === 'top') {
      left = rect.left + rect.width / 2 - cardWidth / 2;
      top = rect.top - cardHeight - 16;
    }
    if (placement === 'bottom') {
      left = rect.left + rect.width / 2 - cardWidth / 2;
      top = rect.bottom + 16;
    }

    left = clamp(left, margin, window.innerWidth - cardWidth - margin);
    top = clamp(top, margin, window.innerHeight - cardHeight - margin);
    setBubblePos({ left, top });
  }, [active]);

  useLayoutEffect(() => {
    updateBubblePosition();
  }, [updateBubblePosition]);

  if (!enabled || !active) return null;

  return (
    <div className="help-overlay" aria-hidden="true">
      <div
        className="help-highlight"
        style={{
          top: active.rect.top - 6,
          left: active.rect.left - 6,
          width: active.rect.width + 12,
          height: active.rect.height + 12,
        }}
      />
      <div className="help-bubble" ref={bubbleRef} style={bubblePos ?? undefined}>
        <div className="help-title">{active.title}</div>
        <div className="help-body">{active.body}</div>
      </div>
    </div>
  );
}
