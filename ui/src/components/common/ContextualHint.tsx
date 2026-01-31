import { useCallback, useEffect, useState } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';

type HintConfig = {
  id: string;
  trigger: 'idle' | 'action' | 'always';
  condition?: () => boolean;
  message: string;
  action?: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'inline';
};

const HINTS: HintConfig[] = [
  {
    id: 'hint-playback',
    trigger: 'idle',
    message: 'Press Space to start playback',
    shortcut: 'Space',
    position: 'bottom',
  },
  {
    id: 'hint-flow',
    trigger: 'action',
    message: 'Press F to see the dependency graph',
    shortcut: 'F',
    position: 'bottom',
  },
  {
    id: 'hint-inspect',
    trigger: 'action',
    message: 'Click any step to inspect its payload',
    position: 'inline',
  },
  {
    id: 'hint-command',
    trigger: 'idle',
    message: 'Open command palette',
    shortcut: '\u2318K',
    position: 'top',
  },
  {
    id: 'hint-shortcuts',
    trigger: 'idle',
    message: 'Press ? to see all keyboard shortcuts',
    shortcut: '?',
    position: 'bottom',
  },
];

type ContextualHintProps = {
  hintId: string;
  className?: string;
  delay?: number;
  showOnce?: boolean;
};

export function ContextualHint({ hintId, className = '', delay = 3000, showOnce = true }: ContextualHintProps) {
  const [dismissedHints, setDismissedHints] = usePersistedState<string[]>('agentDirector.dismissedHints', []);
  const [visible, setVisible] = useState(false);

  const hint = HINTS.find((h) => h.id === hintId);
  const isDismissed = dismissedHints.includes(hintId);

  useEffect(() => {
    if (!hint || (showOnce && isDismissed)) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [hint, isDismissed, showOnce, delay]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (showOnce) {
      setDismissedHints((prev) => [...prev, hintId]);
    }
  }, [hintId, showOnce, setDismissedHints]);

  if (!hint || !visible) return null;

  return (
    <div
      className={`contextual-hint ${className} hint-${hint.position ?? 'inline'}`}
      role="status"
      aria-live="polite"
    >
      <span className="hint-message">{hint.message}</span>
      {hint.shortcut && <kbd className="hint-shortcut">{hint.shortcut}</kbd>}
      <button
        type="button"
        className="hint-dismiss"
        onClick={dismiss}
        aria-label="Dismiss hint"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Tip of the day component
type TipOfTheDayProps = {
  onDismiss?: () => void;
};

const TIPS = [
  { tip: 'Use Story Mode (S) to get a guided walkthrough of a trace', category: 'Navigation' },
  { tip: 'Jump to bottleneck from the InsightStrip to find slow steps instantly', category: 'Performance' },
  { tip: 'Enable Safe Export before sharing payloads to auto-redact sensitive data', category: 'Security' },
  { tip: 'Use Flow mode (F) to visualize step dependencies and parallelism', category: 'Analysis' },
  { tip: 'Arrow keys navigate between step boundaries during playback', category: 'Navigation' },
  { tip: 'The Journey panel tracks your progress through the 3-act analysis flow', category: 'Onboarding' },
  { tip: 'Replay from any step to create a Director\'s Cut and compare outcomes', category: 'Advanced' },
  { tip: 'Toggle Explain mode (E) for contextual help on any UI element', category: 'Help' },
];

export function TipOfTheDay({ onDismiss }: TipOfTheDayProps) {
  const [dismissedTips, setDismissedTips] = usePersistedState<string[]>('agentDirector.dismissedTips', []);
  const [lastTipDate, setLastTipDate] = usePersistedState<string>('agentDirector.lastTipDate', '');

  const today = new Date().toDateString();
  const isNewDay = lastTipDate !== today;

  // Get an undismissed tip for today
  const availableTips = TIPS.filter((t) => !dismissedTips.includes(t.tip));
  const todayTip = availableTips.length > 0 ? availableTips[Math.floor(Math.random() * availableTips.length)] : null;

  const handleDismiss = useCallback(() => {
    if (todayTip) {
      setDismissedTips((prev) => [...prev, todayTip.tip]);
    }
    setLastTipDate(today);
    onDismiss?.();
  }, [todayTip, today, setDismissedTips, setLastTipDate, onDismiss]);

  // Don't show if already seen today or no tips left
  if (!isNewDay || !todayTip) return null;

  return (
    <div className="tip-of-the-day" role="complementary" aria-label="Tip of the day">
      <div className="tip-header">
        <span className="tip-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <span className="tip-label">Tip of the day</span>
        <span className="tip-category">{todayTip.category}</span>
      </div>
      <p className="tip-content">{todayTip.tip}</p>
      <button type="button" className="tip-dismiss ghost-button" onClick={handleDismiss}>
        Got it
      </button>
    </div>
  );
}

// Progress indicator for mastery
type MasteryProgressProps = {
  completedActions: string[];
};

const MASTERY_MILESTONES = [
  { id: 'viewed-trace', label: 'Viewed a trace', description: 'Loaded and explored an agent trace' },
  { id: 'used-playback', label: 'Used playback', description: 'Played the timeline to watch execution' },
  { id: 'inspected-step', label: 'Inspected a step', description: 'Opened the Inspector to view details' },
  { id: 'used-flow', label: 'Explored Flow mode', description: 'Viewed the dependency graph' },
  { id: 'used-replay', label: 'Created a replay', description: 'Replayed from a step to compare outcomes' },
  { id: 'used-compare', label: 'Compared runs', description: 'Used Compare mode to see differences' },
  { id: 'used-shortcuts', label: 'Power user', description: 'Used keyboard shortcuts for navigation' },
];

export function MasteryProgress({ completedActions }: MasteryProgressProps) {
  const completed = MASTERY_MILESTONES.filter((m) => completedActions.includes(m.id));
  const percentage = Math.round((completed.length / MASTERY_MILESTONES.length) * 100);

  return (
    <div className="mastery-progress" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="mastery-header">
        <span className="mastery-title">Mastery Progress</span>
        <span className="mastery-percentage">{percentage}%</span>
      </div>
      <div className="mastery-bar">
        <div className="mastery-fill" style={{ width: `${percentage}%` }} />
      </div>
      <ul className="mastery-milestones">
        {MASTERY_MILESTONES.map((milestone) => (
          <li
            key={milestone.id}
            className={`mastery-milestone ${completedActions.includes(milestone.id) ? 'completed' : ''}`}
          >
            <span className="milestone-check">
              {completedActions.includes(milestone.id) ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </span>
            <span className="milestone-label">{milestone.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
