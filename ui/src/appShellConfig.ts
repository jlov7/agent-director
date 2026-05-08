import type { OnboardingPath } from './components/onboarding/RolePathSelector';
import type { UxRebootRoute } from './routes/routeConfig';
import type { StepType } from './types';

export type Mode = 'cinema' | 'flow' | 'compare' | 'matrix' | 'gameplay';
export type IntroPersona = 'builder' | 'executive' | 'operator';
export type ThemeMode = 'studio' | 'focus' | 'contrast';
export type MotionMode = 'cinematic' | 'balanced' | 'minimal';
export type DensityMode = 'auto' | 'comfortable' | 'compact';
export type LaunchPath = 'rapid_triage' | 'deep_diagnosis' | 'team_sync';
export type RecommendationTone = 'priority' | 'warning' | 'info';
export type SaaSRole = 'viewer' | 'operator' | 'admin';
export type WorkspaceSection = 'journey' | 'analysis' | 'collaboration' | 'operations';
export type SetupWizardStep = 'source' | 'import' | 'invite';
export type ExportTaskStatus = 'queued' | 'running' | 'success' | 'error';
export type WorkspaceOption = { id: string; label: string };
export type SavedView = {
  id: string;
  name: string;
  state: {
    mode: Mode;
    query: string;
    typeFilter: StepType | 'all';
    selectedStepId: string | null;
    safeExport: boolean;
    windowed: boolean;
    syncPlayback: boolean;
    explainMode: boolean;
    section: WorkspaceSection;
  };
};
export type ExportTask = {
  id: string;
  label: string;
  status: ExportTaskStatus;
  detail: string;
  updatedAt: number;
  retryable: boolean;
};
export type RouteLastCompletedAction = { id: string; label: string; at: string } | null;
export type RouteLastCompletedByRoute = Record<UxRebootRoute, RouteLastCompletedAction>;
export type RouteActionHistoryEntry = {
  id: string;
  route: UxRebootRoute;
  label: string;
  at: string;
};
export type StuckSignalKind = 'rage_click' | 'dead_end_actions';
export type StuckSignal = {
  id: string;
  kind: StuckSignalKind;
  detail: string;
  at: number;
};
export type UxRebootCohort = 'off' | 'internal' | 'pilot' | 'ga';

export const WORKSPACE_SECTION_COPY: Record<WorkspaceSection, { title: string; description: string }> = {
  journey: {
    title: 'Understand this run',
    description: 'Track progression and save the exact view you need to return to quickly.',
  },
  analysis: {
    title: 'Diagnose root cause',
    description: 'Run exports and async diagnostics to isolate what changed and why.',
  },
  collaboration: {
    title: 'Coordinate responders',
    description: 'Set ownership, create handoffs, and keep the team aligned in real time.',
  },
  operations: {
    title: 'Configure workspace',
    description: 'Manage setup, support access, and release-safe feature controls.',
  },
};

export const MODE_ORIENTATION_COPY: Record<Mode, string> = {
  cinema: 'Timeline playback',
  flow: 'Flow graph',
  compare: 'Compare runs',
  matrix: 'Scenario matrix',
  gameplay: 'Gameplay command',
};

export const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'operations', label: 'Operations' },
  { id: 'executive', label: 'Executive' },
];

export const UX_REBOOT_ROUTE_TO_SECTION: Record<UxRebootRoute, WorkspaceSection> = {
  overview: 'journey',
  triage: 'analysis',
  diagnose: 'analysis',
  coordinate: 'collaboration',
  settings: 'operations',
};

export const UX_REBOOT_ROUTE_LABEL: Record<UxRebootRoute, string> = {
  overview: 'Review',
  triage: 'Triage',
  diagnose: 'Diagnose',
  coordinate: 'Coordinate',
  settings: 'Configure',
};

export const UX_REBOOT_BASE_ROUTE_ORDER: UxRebootRoute[] = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'];

export const UX_REBOOT_ROUTE_ARIA_LABEL: Record<UxRebootRoute, string> = {
  overview: 'Review workspace route',
  triage: 'Triage workspace route',
  diagnose: 'Diagnose workspace route',
  coordinate: 'Coordinate workspace route',
  settings: 'Configure workspace route',
};

export const UX_REBOOT_ROUTE_INTENT_COPY: Record<UxRebootRoute, string> = {
  overview: 'Understand health and risk quickly.',
  triage: 'Resolve the most urgent failure first.',
  diagnose: 'Build evidence-backed causal findings.',
  coordinate: 'Align ownership and handoff continuity.',
  settings: 'Set safe defaults and workspace controls.',
};

export const UX_REBOOT_ROUTE_TRANSITION_COPY: Record<UxRebootRoute, string> = {
  overview: 'You now see summary health signals and a single risk-first next step.',
  triage: 'You now see incident-first actions ordered observe -> isolate -> validate -> share.',
  diagnose: 'You now see hypothesis workflow steps with evidence and async checkpoints.',
  coordinate: 'You now see ownership and handoff continuity controls with snapshot history.',
  settings: 'You now see safety defaults, trust controls, and rollout toggles.',
};

export const UX_REBOOT_ROUTE_FOCUS_COPY: Record<UxRebootRoute, string> = {
  overview: 'Stay focused on run health and top risk. Open the analysis canvas only when you need timeline detail.',
  triage: 'Run the triage sequence one action at a time. Open the analysis canvas for deep flow or validation detail.',
  diagnose: 'Keep diagnosis checkpoints concise here. Open the analysis canvas when you need matrix or timeline evidence.',
  coordinate: 'Keep ownership and handoff continuity clear here. Open the analysis canvas when evidence context is requested.',
  settings: 'Keep trust defaults explicit here. Open the analysis canvas only when configuration needs trace context.',
};

export const UX_REBOOT_ROUTE_FOCUS_TRIGGER_COPY: Record<UxRebootRoute, string> = {
  overview: 'Open full canvas when you need exact timeline position, step payload inspection, or side-by-side compare context.',
  triage: 'Open full canvas when isolate or validate needs flow graph, matrix replay, or deeper inspector detail.',
  diagnose: 'Open full canvas when validation requires matrix runs, export detail, or cross-step payload comparison.',
  coordinate: 'Open full canvas when responders ask for precise step-level evidence during ownership or handoff decisions.',
  settings: 'Open full canvas when trust or rollout changes require live trace validation before release.',
};

export const DEFAULT_ROUTE_LAST_COMPLETED: RouteLastCompletedByRoute = {
  overview: null,
  triage: null,
  diagnose: null,
  coordinate: null,
  settings: null,
};

export const ONBOARDING_PATH_TO_PERSONA: Record<OnboardingPath, IntroPersona> = {
  evaluate: 'executive',
  operate: 'operator',
  investigate: 'builder',
};
