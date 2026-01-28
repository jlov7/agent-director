import type { TraceSummary } from '../../types';

const tips = [
  'Press ? for keyboard shortcuts.',
  'Use Windowed mode for large traces.',
  'Click any step to inspect redacted payloads.',
  'Toggle Safe export before sharing screenshots.',
];

type OnboardingTipsProps = {
  trace: TraceSummary | null;
  onDismiss: () => void;
};

export default function OnboardingTips({ trace, onDismiss }: OnboardingTipsProps) {
  if (!trace) return null;
  if (trace.steps.length === 0) {
    return (
      <section className="onboarding">
        <div className="onboarding-title">No steps yet</div>
        <p className="onboarding-body">Load a trace or start your agent to see playback here.</p>
      </section>
    );
  }

  return (
    <section className="onboarding">
      <div className="onboarding-title">Getting started</div>
      <ul className="onboarding-list">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <button className="ghost-button" type="button" onClick={onDismiss} aria-label="Dismiss tips">
        Got it
      </button>
    </section>
  );
}
