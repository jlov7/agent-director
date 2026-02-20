export type OnboardingPath = 'evaluate' | 'operate' | 'investigate';

type PathOption = {
  id: OnboardingPath;
  label: string;
  body: string;
};

const PATH_OPTIONS: PathOption[] = [
  {
    id: 'evaluate',
    label: 'Evaluate',
    body: 'See value quickly with a concise end-to-end walkthrough.',
  },
  {
    id: 'operate',
    label: 'Operate',
    body: 'Start incident triage and unblock the team fast.',
  },
  {
    id: 'investigate',
    label: 'Investigate',
    body: 'Run deeper diagnosis with flow, compare, and matrix tools.',
  },
];

type RolePathSelectorProps = {
  value: OnboardingPath;
  onChange: (path: OnboardingPath) => void;
};

export default function RolePathSelector({ value, onChange }: RolePathSelectorProps) {
  return (
    <div className="onboarding-path-selector" role="group" aria-label="Choose onboarding path">
      {PATH_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`ghost-button onboarding-path-option ${value === option.id ? 'active' : ''}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          <span className="onboarding-path-label">{option.label}</span>
          <span className="onboarding-path-body">{option.body}</span>
        </button>
      ))}
    </div>
  );
}
