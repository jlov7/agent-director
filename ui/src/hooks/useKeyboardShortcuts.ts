import { useCallback, useEffect } from 'react';
import type { StepSummary, TraceSummary } from '../types';

export type KeyboardShortcutHandlers = {
  // Playback
  togglePlayback: () => void;
  seekToBoundary: (direction: 'prev' | 'next', steps: StepSummary[]) => void;
  jumpToStart: () => void;
  jumpToEnd: (trace: TraceSummary | null) => void;

  // Modes
  setMode: (mode: 'cinema' | 'flow' | 'compare') => void;
  handleModeChange: (mode: 'cinema' | 'flow' | 'compare') => void;

  // Inspector
  setSelectedStepId: (id: string | null) => void;

  // Onboarding
  startTour: () => void;
  toggleExplain: () => void;

  // Story
  toggleStory: () => void;

  // Modals
  setShowShortcuts: (show: boolean) => void;
  setShowPalette: (show: boolean) => void;
};

export type KeyboardShortcutState = {
  mode: 'cinema' | 'flow' | 'compare';
  selectedStepId: string | null;
  showShortcuts: boolean;
  showPalette: boolean;
  trace: TraceSummary | null;
  steps: StepSummary[];
};

export function useKeyboardShortcuts(
  state: KeyboardShortcutState,
  handlers: KeyboardShortcutHandlers
): void {
  const {
    mode,
    selectedStepId,
    showShortcuts,
    showPalette,
    trace,
    steps,
  } = state;

  const {
    togglePlayback,
    seekToBoundary,
    jumpToStart,
    jumpToEnd,
    setMode,
    handleModeChange,
    setSelectedStepId,
    startTour,
    toggleExplain,
    toggleStory,
    setShowShortcuts,
    setShowPalette,
  } = handlers;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur inputs
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Command palette toggle (Cmd/Ctrl + K)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowPalette((prev) => !prev);
        return;
      }

      // Close modals on Escape
      if (event.key === 'Escape') {
        if (showPalette) {
          setShowPalette(false);
          return;
        }
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (selectedStepId) {
          setSelectedStepId(null);
          return;
        }
        return;
      }

      // Don't handle other shortcuts if a modal is open
      if (showPalette || showShortcuts) return;

      // Show shortcuts (?)
      if (event.key === '?') {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Play/pause (Space)
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
        return;
      }

      // Story mode (S)
      if (event.key.toLowerCase() === 's' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        toggleStory();
        return;
      }

      // Explain mode (E)
      if (event.key.toLowerCase() === 'e' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        toggleExplain();
        return;
      }

      // Start tour (T)
      if (event.key.toLowerCase() === 't' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        startTour();
        return;
      }

      // Toggle Flow mode (F)
      if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (mode === 'flow') {
          setMode('cinema');
        } else if (mode === 'cinema') {
          handleModeChange('flow');
        }
        return;
      }

      // Toggle Inspector (I)
      if (event.key.toLowerCase() === 'i' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (selectedStepId) {
          setSelectedStepId(null);
        } else if (steps.length > 0) {
          // Select the first step
          setSelectedStepId(steps[0].id);
        }
        return;
      }

      // Arrow key navigation
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();

        if (event.shiftKey) {
          // Jump to start/end
          if (event.key === 'ArrowLeft') {
            jumpToStart();
          } else {
            jumpToEnd(trace);
          }
        } else {
          // Seek to boundary
          seekToBoundary(event.key === 'ArrowLeft' ? 'prev' : 'next', steps);
        }
        return;
      }
    },
    [
      mode,
      selectedStepId,
      showShortcuts,
      showPalette,
      trace,
      steps,
      togglePlayback,
      seekToBoundary,
      jumpToStart,
      jumpToEnd,
      setMode,
      handleModeChange,
      setSelectedStepId,
      startTour,
      toggleExplain,
      toggleStory,
      setShowShortcuts,
      setShowPalette,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
