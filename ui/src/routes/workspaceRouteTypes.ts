import type { RouteTimelineItem } from '../components/journeys/ExecutionTimeline';
import type { FeatureFlags } from '../utils/saasUx';
import type { UxRebootRoute } from './routeConfig';

export type WorkspaceRouteStatus = 'loading' | 'running' | 'completed' | 'failed' | null;

export type RouteProgress = {
  completed: number;
  total: number;
};

export type RouteLastCompletedAction = {
  id: string;
  label: string;
  at: string;
};

export type RouteActionHistoryEntry = {
  id: string;
  route: UxRebootRoute;
  label: string;
  at: string;
};

export type RouteSnapshot = {
  id: string;
  route: UxRebootRoute;
  summary: string;
  at: string;
};

export type WorkspaceRouteProps = {
  route: UxRebootRoute;
  status: WorkspaceRouteStatus;
  runHealthScore: number;
  workspaceRole: 'viewer' | 'operator' | 'admin';
  runOwner: string;
  handoffOwner: string;
  routeProgress: RouteProgress;
  lastCompletedAction: RouteLastCompletedAction | null;
  actionHistory: RouteActionHistoryEntry[];
  snapshots: RouteSnapshot[];
  activityFeed: Array<{ id: string; message: string; timestamp: number }>;
  asyncTimeline: RouteTimelineItem[];
  themeMode: 'studio' | 'focus' | 'contrast';
  motionMode: 'cinematic' | 'balanced' | 'minimal';
  densityMode: 'auto' | 'comfortable' | 'compact';
  appLocale: 'en' | 'es';
  gameplayLocale: 'en' | 'es';
  safeExport: boolean;
  gamepadEnabled: boolean;
  windowed: boolean;
  rolloutCohort: 'off' | 'internal' | 'pilot' | 'ga';
  featureFlags: FeatureFlags;
  onRouteAction: (actionId: string) => void;
  onRetryAsyncAction: (id: string) => void;
  onResumeAsyncAction: (id: string) => void;
  onRetryExportTask: (id: string) => void;
  onRunOwnerChange: (value: string) => void;
  onHandoffOwnerChange: (value: string) => void;
  onThemeModeChange: (value: 'studio' | 'focus' | 'contrast') => void;
  onMotionModeChange: (value: 'cinematic' | 'balanced' | 'minimal') => void;
  onDensityModeChange: (value: 'auto' | 'comfortable' | 'compact') => void;
  onAppLocaleChange: (value: 'en' | 'es') => void;
  onGameplayLocaleChange: (value: 'en' | 'es') => void;
  onToggleSafeExport: () => void;
  onToggleGamepadEnabled: () => void;
  onToggleWindowed: () => void;
  onRolloutCohortChange: (value: 'off' | 'internal' | 'pilot' | 'ga') => void;
  onToggleFeatureFlag: (key: keyof FeatureFlags) => void;
};
