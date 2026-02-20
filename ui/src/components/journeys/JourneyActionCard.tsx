type JourneyActionCardProps = {
  title: string;
  outcome: string;
  why: string;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'error';
  resume?: boolean;
};

export default function JourneyActionCard({
  title,
  outcome,
  why,
  ctaLabel,
  onCta,
  disabled = false,
  tone = 'default',
  resume = false,
}: JourneyActionCardProps) {
  return (
    <article className={`journey-action-card tone-${tone}`}>
      <div className="journey-action-card-header">
        <h3>{title}</h3>
        {resume ? <span className="status-badge">Resume here</span> : null}
      </div>
      <p className="journey-action-outcome">Outcome: {outcome}</p>
      <p className="journey-action-why">Why this matters: {why}</p>
      <button className="ghost-button" type="button" onClick={onCta} disabled={disabled}>
        {ctaLabel}
      </button>
    </article>
  );
}
