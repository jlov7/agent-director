import { useEffect, useState } from 'react';
import type { StepDetails, StepSummary } from '../../types';
import { fetchStepDetails } from '../../store/api';
import StepBadge from '../common/StepBadge';

function formatJson(data: unknown) {
  return JSON.stringify(data, null, 2);
}

type InspectorProps = {
  traceId: string;
  step: StepSummary | null;
  safeExport: boolean;
  onClose: () => void;
  onReplay: (stepId: string) => void;
};

export default function Inspector({ traceId, step, safeExport, onClose, onReplay }: InspectorProps) {
  const [details, setDetails] = useState<StepDetails | null>(null);
  const [mode, setMode] = useState<'redacted' | 'raw'>('redacted');
  const [revealedPaths, setRevealedPaths] = useState<string[]>([]);

  useEffect(() => {
    setRevealedPaths([]);
    setMode('redacted');
  }, [step?.id, safeExport]);

  useEffect(() => {
    if (!step) return;
    let active = true;
    const run = async () => {
      const effectiveMode = safeExport ? 'redacted' : mode;
      const next = await fetchStepDetails(
        traceId,
        step.id,
        effectiveMode,
        effectiveMode === 'redacted' ? revealedPaths : [],
        safeExport
      );
      if (active) setDetails(next);
    };
    run();
    return () => {
      active = false;
    };
  }, [traceId, step, mode, safeExport, revealedPaths]);

  if (!step) return null;

  const redaction = details?.redaction;
  const redactedFields = redaction?.fieldsRedacted ?? [];
  const revealedFields = redaction?.revealedFields ?? [];

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div>
          <div className="inspector-title">
            <StepBadge type={step.type} size="md" showLabel />
            <span>{step.name}</span>
            <span className={`status-pill status-${step.status}`}>{step.status}</span>
          </div>
          <div className="inspector-subtitle">{step.type}</div>
        </div>
        <button className="ghost-button" type="button" onClick={onClose} aria-label="Close inspector">
          Close
        </button>
      </div>

      <div className="inspector-section">
        <div className="inspector-row">
          <span>Status</span>
          <span>{step.status}</span>
        </div>
        <div className="inspector-row">
          <span>Duration</span>
          <span>{step.durationMs ?? 0}ms</span>
        </div>
        <div className="inspector-row">
          <span>Tokens</span>
          <span>{step.metrics?.tokensTotal ?? '-'}</span>
        </div>
        <div className="inspector-row">
          <span>Cost</span>
          <span>{step.metrics?.costUsd != null ? `$${step.metrics.costUsd.toFixed(3)}` : '-'}</span>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Payload</div>
        <div className="inspector-controls">
          <label title={safeExport ? 'Safe export enabled: raw view disabled.' : 'Toggle raw payload view.'}>
            <input
              type="checkbox"
              checked={mode === 'raw'}
              disabled={safeExport}
              onChange={(event) => setMode(event.target.checked ? 'raw' : 'redacted')}
            />
            Reveal raw (dangerous)
          </label>
          <button
            className="ghost-button"
            type="button"
            aria-label="Copy payload JSON"
            onClick={async () => {
              if (!details) return;
              await navigator.clipboard.writeText(JSON.stringify(details.data, null, 2));
            }}
          >
            Copy JSON
          </button>
          {revealedPaths.length > 0 && mode === 'redacted' ? (
            <button
              className="ghost-button"
              type="button"
              aria-label="Reset revealed fields"
              onClick={() => setRevealedPaths([])}
            >
              Reset reveals
            </button>
          ) : null}
        </div>
        <pre className="inspector-json">{details ? formatJson(details.data) : 'Loading...'}</pre>
        {redactedFields.length > 0 ? (
          <div className="inspector-redaction">
            Redacted fields:
            <ul>
              {redactedFields.map((field) => {
                const canReveal = !safeExport && mode === 'redacted';
                return (
                  <li key={field.path}>
                    {field.path} ({field.kind})
                    {canReveal ? (
                      <button
                        className="ghost-button"
                        type="button"
                        aria-label={`Reveal ${field.path}`}
                        onClick={() =>
                          setRevealedPaths((prev) =>
                            prev.includes(field.path) ? prev : [...prev, field.path]
                          )
                        }
                      >
                        Reveal
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {revealedFields.length > 0 ? (
              <div className="inspector-revealed">
                Revealed:
                <ul>
                  {revealedFields.map((field) => (
                    <li key={field.path}>
                      {field.path} ({field.kind})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="inspector-section">
        <button className="primary-button" type="button" onClick={() => onReplay(step.id)}>
          Replay from this step
        </button>
      </div>
    </aside>
  );
}
