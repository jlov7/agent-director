import type { ReactNode } from 'react';

type AppShellStateVariant = 'loading' | 'empty' | 'error';

type AppShellAction = {
  id: string;
  label: string;
  node: ReactNode;
};

type AppShellStateProps = {
  variant: AppShellStateVariant;
  title: string;
  message: string;
  actions?: AppShellAction[];
};

export default function AppShellState({ variant, title, message, actions = [] }: AppShellStateProps) {
  return (
    <section className={`app-shell-state app-shell-${variant}`} aria-live="polite">
      <div className="app-shell-card">
        {variant === 'loading' ? <div className="app-shell-spinner" aria-hidden="true" /> : null}
        <h2>{title}</h2>
        <p>{message}</p>
        {actions.length ? (
          <div className="app-shell-actions">
            {actions.map((action) => (
              <span key={action.id}>{action.node}</span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
