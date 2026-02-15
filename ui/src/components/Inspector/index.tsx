import { useEffect, useState } from 'react';
import type { StepDetails, StepSummary, TraceComment } from '../../types';
import { createComment, fetchComments, fetchStepDetails } from '../../store/api';
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
  const [comments, setComments] = useState<TraceComment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState('director');
  const [commentBody, setCommentBody] = useState('');
  const [commentPinned, setCommentPinned] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);

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

  useEffect(() => {
    if (!step) return;
    let active = true;
    const loadComments = async () => {
      const next = await fetchComments(traceId, step.id);
      if (active) setComments(next);
    };
    void loadComments();
    return () => {
      active = false;
    };
  }, [traceId, step]);

  if (!step) return null;

  const redaction = details?.redaction;
  const redactedFields = redaction?.fieldsRedacted ?? [];
  const revealedFields = redaction?.revealedFields ?? [];

  return (
    <aside
      className="inspector"
      data-help
      data-help-indicator
      data-tour="inspector"
      data-help-title="Inspector panel"
      data-help-body="Deep dive into a single step: payloads, redaction, metrics, and replay."
      data-help-placement="left"
    >
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
          <label
            title={safeExport ? 'Safe export enabled: raw view disabled.' : 'Toggle raw payload view.'}
            data-help
            data-help-title="Raw payload"
            data-help-body="Switch between redacted and raw payloads when Safe export is off."
            data-help-placement="top"
          >
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
            data-help
            data-help-title="Copy JSON"
            data-help-body="Copy the payload to your clipboard."
            data-help-placement="top"
          >
            Copy JSON
          </button>
          {revealedPaths.length > 0 && mode === 'redacted' ? (
            <button
              className="ghost-button"
              type="button"
              aria-label="Reset revealed fields"
              onClick={() => setRevealedPaths([])}
              data-help
              data-help-title="Reset reveals"
              data-help-body="Re-hide any fields you temporarily revealed."
              data-help-placement="top"
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
        <button
          className="primary-button"
          type="button"
          onClick={() => onReplay(step.id)}
          data-help
          data-help-title="Replay"
          data-help-body="Branch a new run starting from this step."
          data-help-placement="top"
        >
          Replay from this step
        </button>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-title">Collaboration notes</div>
        <div className="inspector-controls">
          <input
            className="search-input"
            value={commentAuthor}
            onChange={(event) => setCommentAuthor(event.target.value)}
            placeholder="Author"
            aria-label="Comment author"
          />
          <label>
            <input
              type="checkbox"
              checked={commentPinned}
              onChange={(event) => setCommentPinned(event.target.checked)}
            />
            Pin
          </label>
        </div>
        <textarea
          className="search-input"
          value={commentBody}
          onChange={(event) => setCommentBody(event.target.value)}
          placeholder="Add an investigation note..."
          aria-label="Comment body"
          rows={3}
        />
        <div className="inspector-controls">
          <button
            className="ghost-button"
            type="button"
            disabled={commentSaving || !commentBody.trim()}
            onClick={async () => {
              if (!commentBody.trim()) return;
              setCommentSaving(true);
              const created = await createComment(
                traceId,
                step.id,
                commentAuthor || 'director',
                commentBody,
                commentPinned
              );
              setCommentSaving(false);
              if (!created) return;
              setCommentBody('');
              setCommentPinned(false);
              const next = await fetchComments(traceId, step.id);
              setComments(next);
            }}
          >
            {commentSaving ? 'Saving...' : 'Add note'}
          </button>
        </div>
        <div className="inspector-comments">
          {comments.length === 0 ? (
            <div className="inspector-comments-empty">No notes yet.</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="inspector-comment">
                <div className="inspector-row">
                  <span>
                    {comment.author}
                    {comment.pinned ? ' (pinned)' : ''}
                  </span>
                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <div>{comment.body}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
