import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import type { TraceSummary } from '../types';

export type TourStep = {
  target: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

export type OnboardingState = {
  tourOpen: boolean;
  tourCompleted: boolean;
  heroDismissed: boolean;
  introDismissed: boolean;
  journeyCollapsed: boolean;
  dockOpen: boolean;
  explainMode: boolean;
  tourSteps: TourStep[];
};

export type OnboardingActions = {
  setTourOpen: (open: boolean) => void;
  setTourCompleted: (completed: boolean) => void;
  setHeroDismissed: (dismissed: boolean) => void;
  setIntroDismissed: (dismissed: boolean) => void;
  setJourneyCollapsed: (collapsed: boolean) => void;
  setDockOpen: (open: boolean) => void;
  setExplainMode: (enabled: boolean) => void;
  startTour: () => void;
  endTour: () => void;
  dismissHero: () => void;
  dismissIntro: () => void;
  toggleExplain: () => void;
  toggleJourneyPanel: () => void;
  toggleDock: () => void;
};

export function useOnboarding(
  compareTrace: TraceSummary | null
): [OnboardingState, OnboardingActions] {
  const [tourOpen, setTourOpen] = useState(false);
  const [tourCompleted, setTourCompleted] = usePersistedState('agentDirector.tourCompleted', false);
  const [heroDismissed, setHeroDismissed] = usePersistedState('agentDirector.heroDismissed', false);
  const [introDismissed, setIntroDismissed] = usePersistedState('agentDirector.introDismissed', false);
  const [journeyCollapsed, setJourneyCollapsed] = usePersistedState('agentDirector.journeyCollapsed', false);
  const [dockOpen, setDockOpen] = usePersistedState('agentDirector.dockOpen', true);
  const [explainMode, setExplainMode] = usePersistedState('agentDirector.explainMode', false);

  // Build tour steps based on current state
  const tourSteps = useMemo<TourStep[]>(() => {
    const steps: TourStep[] = [
      {
        target: '.header',
        title: 'Mission control',
        body: 'Confirm the run, status, and metadata. Use Guide and Explain to orient the room instantly.',
        placement: 'bottom',
      },
      {
        target: '.hero-ribbon',
        title: 'Director briefing',
        body: 'Choose Tour, Story mode, or Explain to ramp up quickly.',
        placement: 'bottom',
      },
      {
        target: '.insight-strip',
        title: 'Fast diagnosis',
        body: 'Jump straight to bottlenecks, errors, and high-cost steps with one click.',
        placement: 'bottom',
      },
      {
        target: '.journey-panel',
        title: 'Director journey',
        body: 'A narrative path that teaches how to watch, inspect, and direct a better run.',
        placement: 'right',
      },
      {
        target: '.toolbar',
        title: 'Filters + modes',
        body: 'Search, filter, and switch between Cinema, Flow, and Compare as the story evolves.',
        placement: 'bottom',
      },
      {
        target: '.quick-actions-dock',
        title: 'Quick actions',
        body: 'Launch Story Mode, open the command palette, or jump to bottlenecks instantly.',
        placement: 'left',
      },
      {
        target: '.main',
        title: 'Cinema stage',
        body: 'The timeline shows every step as a scene. Scrub to see pacing and concurrency.',
        placement: 'top',
      },
      {
        target: '.inspector, .director-brief',
        title: 'Inspector',
        body: 'Open any step to read payloads, apply redaction, and replay from that moment.',
        placement: 'left',
      },
    ];

    // Add compare step if a replay exists
    if (compareTrace) {
      steps.push({
        target: '.mode-tabs [aria-pressed="false"]:last-child, .ghost-button:contains("Compare")',
        title: 'Compare runs',
        body: 'Side-by-side diff of the original and replay. See what changed.',
        placement: 'left',
      });
    } else {
      steps.push({
        target: '.mode-tabs',
        title: 'Compare runs',
        body: 'Replay from a step to unlock compare mode and validate improvements.',
        placement: 'left',
      });
    }

    return steps;
  }, [compareTrace]);

  // Auto-open tour after intro dismissal (if not completed)
  useEffect(() => {
    if (introDismissed && !tourCompleted && !tourOpen) {
      // Small delay to allow intro animation to complete
      const timer = setTimeout(() => {
        setTourOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [introDismissed, tourCompleted, tourOpen]);

  // Sync explain mode to DOM
  useEffect(() => {
    if (explainMode) {
      document.body.classList.add('explain-mode');
    } else {
      document.body.classList.remove('explain-mode');
    }
    return () => {
      document.body.classList.remove('explain-mode');
    };
  }, [explainMode]);

  const startTour = useCallback(() => {
    setTourOpen(true);
  }, []);

  const endTour = useCallback(() => {
    setTourOpen(false);
    setTourCompleted(true);
  }, [setTourCompleted]);

  const dismissHero = useCallback(() => {
    setHeroDismissed(true);
  }, [setHeroDismissed]);

  const dismissIntro = useCallback(() => {
    setIntroDismissed(true);
  }, [setIntroDismissed]);

  const toggleExplain = useCallback(() => {
    setExplainMode((prev) => !prev);
  }, [setExplainMode]);

  const toggleJourneyPanel = useCallback(() => {
    setJourneyCollapsed((prev) => !prev);
  }, [setJourneyCollapsed]);

  const toggleDock = useCallback(() => {
    setDockOpen((prev) => !prev);
  }, [setDockOpen]);

  return [
    {
      tourOpen,
      tourCompleted,
      heroDismissed,
      introDismissed,
      journeyCollapsed,
      dockOpen,
      explainMode,
      tourSteps,
    },
    {
      setTourOpen,
      setTourCompleted,
      setHeroDismissed,
      setIntroDismissed,
      setJourneyCollapsed,
      setDockOpen,
      setExplainMode,
      startTour,
      endTour,
      dismissHero,
      dismissIntro,
      toggleExplain,
      toggleJourneyPanel,
      toggleDock,
    },
  ];
}
