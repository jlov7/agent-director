import { useEffect, useMemo, useState } from 'react';
import type { StepSummary, TraceSummary } from '../../types';

type Mode = 'cinema' | 'flow' | 'compare';
type IntroPersona = 'builder' | 'executive' | 'operator';
type WorkspaceTab = 'overview' | 'narrative' | 'collab';

type DirectorRecommendation = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  tone: 'priority' | 'warning' | 'info';
  action: () => void;
};

type DirectorBriefProps = {
  trace: TraceSummary;
  mode: Mode;
  selectedStepId: string | null;
  onModeChange: (mode: Mode) => void;
  onSelectStep: (stepId: string) => void;
  onJumpToBottleneck: () => void;
  onReplay: (stepId: string) => void;
  recommendations?: DirectorRecommendation[];
  persona?: IntroPersona;
  annotations?: Array<{
    id: string;
    stepId: string | null;
    body: string;
    authorSessionId: string;
    createdAt: number;
  }>;
  activityFeed?: Array<{ id: string; sessionId: string; message: string; timestamp: number }>;
  onAddAnnotation?: (body: string, stepId: string | null) => void;
  missionProgress?: Record<string, boolean>;
  missionCompletion?: { done: number; total: number; pct: number };
  onResetMissions?: () => void;
  narrative?: string;
  onAskDirector?: (question: string) => string;
  onExportNarrative?: () => void;
};

const EMPTY_RECOMMENDATIONS: DirectorRecommendation[] = [];
const EMPTY_ANNOTATIONS: Array<{
  id: string;
  stepId: string | null;
  body: string;
  authorSessionId: string;
  createdAt: number;
}> = [];
const EMPTY_ACTIVITY: Array<{ id: string; sessionId: string; message: string; timestamp: number }> = [];
const EMPTY_MISSION_PROGRESS: Record<string, boolean> = {};

function pickBottleneck(steps: StepSummary[]) {
  if (!steps.length) return null;
  return steps.reduce((max, step) => ((step.durationMs ?? 0) > (max.durationMs ?? 0) ? step : max), steps[0]);
}

export default function DirectorBrief({
  trace,
  mode,
  selectedStepId,
  onModeChange,
  onSelectStep,
  onJumpToBottleneck,
  onReplay,
  recommendations = EMPTY_RECOMMENDATIONS,
  persona = 'builder',
  annotations = EMPTY_ANNOTATIONS,
  activityFeed = EMPTY_ACTIVITY,
  onAddAnnotation,
  missionProgress = EMPTY_MISSION_PROGRESS,
  missionCompletion,
  onResetMissions,
  narrative = '',
  onAskDirector,
  onExportNarrative,
}: DirectorBriefProps) {
  const steps = trace.steps ?? [];
  const bottleneck = pickBottleneck(steps);
  const primaryStepId = selectedStepId ?? bottleneck?.id ?? steps[0]?.id ?? null;
  const wall = trace.metadata.wallTimeMs ?? 0;
  const personaLabel =
    persona === 'executive' ? 'Executive lens' : persona === 'operator' ? 'Operator lens' : 'Builder lens';
  const [annotationDraft, setAnnotationDraft] = useState('');
  const [directorQuestion, setDirectorQuestion] = useState('');
  const [directorAnswer, setDirectorAnswer] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [completedRecommendationIds, setCompletedRecommendationIds] = useState<string[]>([]);
  const latestActivity = useMemo(() => activityFeed.slice(0, 6), [activityFeed]);
  const missionDone = missionCompletion?.done ?? 0;
  const analysisUnlocked = missionDone >= 3 || Boolean(missionProgress.inspect);
  const collaborationUnlocked = missionDone >= 5 || Boolean(missionProgress.collaborate) || latestActivity.length > 0;
  const guidedPlan = useMemo(
    () =>
      recommendations.slice(0, 3).map((item, index) => ({
        id: item.id,
        step: `${index + 1}. ${item.actionLabel} — ${item.title}`,
      })),
    [recommendations]
  );

  useEffect(() => {
    setCompletedRecommendationIds((prev) =>
      prev.filter((id) => recommendations.some((item) => item.id === id))
    );
  }, [recommendations]);

  const completedCount = completedRecommendationIds.filter((id) =>
    recommendations.some((item) => item.id === id)
  ).length;
  const recommendationCompletionPct = recommendations.length
    ? Math.round((completedCount / recommendations.length) * 100)
    : 0;

  const runRecommendationAction = (item: DirectorRecommendation) => {
    item.action();
    setCompletedRecommendationIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
  };

  return (
    <aside
      className="inspector inspector-empty"
      data-help
      data-help-indicator
      data-tour="inspector"
      data-help-title="Inspector panel"
      data-help-body="Select a step to open detailed payloads, redaction controls, and replay actions."
      data-help-placement="left"
    >
      <div className="inspector-header">
        <div>
          <div className="inspector-title">Director's notes</div>
          <div className="inspector-subtitle">
            {personaLabel}. Select a step to open deep inspection.
          </div>
        </div>
      </div>

      <div className="director-tabs" role="tablist" aria-label="Director workspace tabs">
        <button
          className={`ghost-button ${activeTab === 'overview' ? 'active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`ghost-button ${activeTab === 'narrative' ? 'active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'narrative'}
          onClick={() => setActiveTab('narrative')}
        >
          Narrative
        </button>
        <button
          className={`ghost-button ${activeTab === 'collab' ? 'active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'collab'}
          onClick={() => setActiveTab('collab')}
        >
          Collaboration
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="inspector-section">
            <div className="inspector-section-title">Run summary</div>
            <div className="inspector-row">
              <span>Steps</span>
              <span>{steps.length}</span>
            </div>
            <div className="inspector-row">
              <span>Wall time</span>
              <span>{wall}ms</span>
            </div>
            <div className="inspector-row">
              <span>Status</span>
              <span>{trace.status}</span>
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Next actions</div>
            <div className="director-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => onModeChange('cinema')}
                data-help
                data-help-title="Open cinema"
                data-help-body="Jump straight into the timeline."
                data-help-placement="right"
              >
                Open cinema
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => onModeChange('flow')}
                data-help
                data-help-title="Open flow"
                data-help-body="See the dependency graph of the run."
                data-help-placement="right"
              >
                Switch to flow
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  if (selectedStepId) return;
                  if (bottleneck) {
                    onJumpToBottleneck();
                    return;
                  }
                  if (primaryStepId) {
                    onSelectStep(primaryStepId);
                  }
                }}
                disabled={!primaryStepId || Boolean(selectedStepId)}
                data-help
                data-help-title="Jump to bottleneck"
                data-help-body="Select the slowest step for inspection."
                data-help-placement="right"
              >
                {selectedStepId ? 'Inspector open' : bottleneck ? 'Jump to bottleneck' : 'Select first step'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => primaryStepId && onReplay(primaryStepId)}
                disabled={!primaryStepId || !analysisUnlocked}
                title={analysisUnlocked ? undefined : 'Complete core missions to unlock replay guidance.'}
                data-help
                data-help-title="Replay"
                data-help-body="Branch a replay from a decisive step."
                data-help-placement="right"
              >
                Replay from step
              </button>
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Mode</div>
            <div className="director-modes">
              <button
                className={`ghost-button ${mode === 'cinema' ? 'active' : ''}`}
                type="button"
                onClick={() => onModeChange('cinema')}
                data-help
                data-help-title="Cinema mode"
                data-help-body="Timeline view for pacing and sequence."
                data-help-placement="right"
              >
                Cinema
              </button>
              <button
                className={`ghost-button ${mode === 'flow' ? 'active' : ''}`}
                type="button"
                onClick={() => onModeChange('flow')}
                data-help
                data-help-title="Flow mode"
                data-help-body="Graph view for dependencies."
                data-help-placement="right"
              >
                Flow
              </button>
              <button className="ghost-button" type="button" disabled>
                Compare
              </button>
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Adaptive missions</div>
            <div className="mission-summary">
              {missionCompletion?.done ?? 0}/{missionCompletion?.total ?? 0} complete
              <span>{missionCompletion?.pct ?? 0}%</span>
            </div>
            <div className="mission-stage">
              Stage: {collaborationUnlocked ? 'Collaboration' : analysisUnlocked ? 'Analysis' : 'Foundation'}
            </div>
            <div className="mission-grid">
              {Object.entries(missionProgress).map(([missionId, done]) => (
                <div key={missionId} className={`mission-chip ${done ? 'done' : ''}`}>
                  <span>{missionId}</span>
                  <span>{done ? 'Done' : 'Pending'}</span>
                </div>
              ))}
            </div>
            <button className="ghost-button" type="button" onClick={onResetMissions}>
              Reset missions
            </button>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Action plan</div>
            {!analysisUnlocked ? (
              <div className="annotation-empty">Complete inspect/flow/replay missions to unlock AI narrative tools.</div>
            ) : recommendations.length === 0 ? (
              <div className="annotation-empty">No recommendations generated yet.</div>
            ) : (
              <>
                <div className="mission-summary">
                  {completedCount}/{recommendations.length} complete
                  <span>{recommendationCompletionPct}%</span>
                </div>
                <div className="director-recommendations">
                  {recommendations.map((item) => {
                    const done = completedRecommendationIds.includes(item.id);
                    return (
                      <article key={item.id} className={`director-recommendation tone-${item.tone} ${done ? 'done' : ''}`}>
                        <div className="director-recommendation-title">{item.title}</div>
                        <p className="director-recommendation-body">{item.body}</p>
                        <button className="ghost-button" type="button" onClick={() => runRecommendationAction(item)}>
                          {done ? 'Completed' : item.actionLabel}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
            {!collaborationUnlocked ? (
              <div className="annotation-empty">Open another live session to unlock collaboration activity feed.</div>
            ) : null}
          </div>
        </>
      ) : null}

      {activeTab === 'narrative' ? (
        <div className="inspector-section">
          <div className="inspector-section-title">AI director narrative</div>
          {!analysisUnlocked ? (
            <div className="annotation-empty">Complete inspect/flow/replay missions to unlock AI narrative tools.</div>
          ) : (
            <>
              <p className="director-recommendation-body">{narrative}</p>
              {guidedPlan.length ? (
                <div className="director-guided-plan">
                  {guidedPlan.map((item) => (
                    <div key={item.id}>{item.step}</div>
                  ))}
                </div>
              ) : null}
              <div className="director-ask-row">
                <input
                  className="search-input"
                  value={directorQuestion}
                  onChange={(event) => setDirectorQuestion(event.target.value)}
                  placeholder="Ask Director (e.g. what is highest risk?)"
                  aria-label="Ask director question"
                />
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    if (!directorQuestion.trim()) return;
                    setDirectorAnswer(onAskDirector?.(directorQuestion) ?? '');
                  }}
                >
                  Ask
                </button>
              </div>
              {directorAnswer ? <div className="director-answer">{directorAnswer}</div> : null}
              <button className="ghost-button" type="button" onClick={onExportNarrative}>
                Export narrative
              </button>
            </>
          )}
        </div>
      ) : null}

      {activeTab === 'collab' ? (
        <>
          <div className="inspector-section">
            <div className="inspector-section-title">Shared annotations</div>
            <textarea
              value={annotationDraft}
              onChange={(event) => setAnnotationDraft(event.target.value)}
              rows={3}
              placeholder={selectedStepId ? 'Add note for selected step...' : 'Add trace-level note...'}
              aria-label="Shared annotation"
            />
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                const trimmed = annotationDraft.trim();
                if (!trimmed) return;
                onAddAnnotation?.(trimmed, selectedStepId);
                setAnnotationDraft('');
              }}
            >
              Add annotation
            </button>
            <div className="annotation-list">
              {annotations.slice(-6).reverse().map((annotation) => (
                <article key={annotation.id} className="annotation-item">
                  <div className="annotation-meta">
                    <span>{annotation.stepId ? `step ${annotation.stepId}` : 'trace'}</span>
                    <span>{annotation.authorSessionId}</span>
                  </div>
                  <p>{annotation.body}</p>
                </article>
              ))}
              {annotations.length === 0 ? <div className="annotation-empty">No shared annotations yet.</div> : null}
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Collab activity</div>
            {!collaborationUnlocked ? (
              <div className="annotation-empty">Open another live session to unlock collaboration activity feed.</div>
            ) : (
              <div className="activity-list">
                {latestActivity.map((item) => (
                  <div key={item.id} className="activity-item">
                    <span>{item.message}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
                {latestActivity.length === 0 ? <div className="annotation-empty">No activity yet.</div> : null}
              </div>
            )}
          </div>
        </>
      ) : null}
    </aside>
  );
}
