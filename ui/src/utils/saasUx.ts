import type { StepSummary, TraceSummary } from '../types';

export type AsyncActionStatus = 'idle' | 'running' | 'success' | 'error' | 'canceled';

export type AsyncActionRecord = {
  id: string;
  label: string;
  status: AsyncActionStatus;
  detail: string;
  updatedAt: number;
  retryable?: boolean;
  resumable?: boolean;
};

export type SetupWizardDraft = {
  dataSource: string;
  importPath: string;
  inviteEmails: string;
};

export type SetupWizardValidation = {
  dataSourceError: string | null;
  importPathError: string | null;
  inviteEmailsError: string | null;
  isValid: boolean;
};

export type ProductEventName =
  | 'ux.setup.opened'
  | 'ux.setup.completed'
  | 'ux.saved_view.created'
  | 'ux.saved_view.applied'
  | 'ux.saved_view.deleted'
  | 'ux.support.opened'
  | 'ux.support.payload_copied'
  | 'ux.export.queued'
  | 'ux.export.completed'
  | 'ux.export.failed'
  | 'ux.export.retried'
  | 'ux.action.retry'
  | 'ux.action.resume'
  | 'ux.action.cancel'
  | 'ux.action.confirmed'
  | 'ux.action.undone'
  | 'ux.palette.opened'
  | 'ux.palette.command_run'
  | 'ux.settings.shortcut.updated'
  | 'ux.feature_flag.toggled'
  | 'ux.error.boundary'
  | 'ux.error.window'
  | 'ux.perf.filter_ms';

export type ProductEvent = {
  name: ProductEventName;
  at: string;
  metadata: Record<string, unknown>;
};

export type FeatureFlags = {
  setupWizardV1: boolean;
  supportPanelV1: boolean;
  exportCenterV1: boolean;
  ownershipPanelV1: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  setupWizardV1: true,
  supportPanelV1: true,
  exportCenterV1: true,
  ownershipPanelV1: true,
};

export const PRODUCT_EVENT_STORAGE_KEY = 'agentDirector.analytics.events.v1';
export const FEATURE_FLAG_STORAGE_KEY = 'agentDirector.featureFlags.v1';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSetupWizardDraft(draft: SetupWizardDraft): SetupWizardValidation {
  const dataSource = draft.dataSource.trim();
  const importPath = draft.importPath.trim();
  const rawEmails = draft.inviteEmails
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const invalidEmails = rawEmails.filter((email) => !EMAIL_REGEX.test(email));
  const dataSourceError = dataSource ? null : 'Select a data source.';
  const importPathError = importPath ? null : 'Import path is required.';
  const inviteEmailsError = invalidEmails.length
    ? `Invalid invite email(s): ${invalidEmails.join(', ')}`
    : null;

  return {
    dataSourceError,
    importPathError,
    inviteEmailsError,
    isValid: !dataSourceError && !importPathError && !inviteEmailsError,
  };
}

export function mergeAsyncAction(
  items: AsyncActionRecord[],
  next: Omit<AsyncActionRecord, 'updatedAt'> & { updatedAt?: number }
): AsyncActionRecord[] {
  const updatedAt = next.updatedAt ?? Date.now();
  const normalized: AsyncActionRecord = { ...next, updatedAt };
  const existingIndex = items.findIndex((item) => item.id === normalized.id);
  if (existingIndex === -1) {
    return [normalized, ...items].slice(0, 12);
  }
  const clone = [...items];
  clone[existingIndex] = { ...clone[existingIndex], ...normalized };
  clone.sort((a, b) => b.updatedAt - a.updatedAt);
  return clone.slice(0, 12);
}

export function readProductEvents(storage: Storage): ProductEvent[] {
  try {
    const parsed = JSON.parse(storage.getItem(PRODUCT_EVENT_STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ProductEvent => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return typeof record.name === 'string' && typeof record.at === 'string' && typeof record.metadata === 'object';
      })
      .slice(-250);
  } catch {
    return [];
  }
}

export function appendProductEvent(storage: Storage, event: ProductEvent): ProductEvent[] {
  const events = readProductEvents(storage);
  const next = [...events, event].slice(-250);
  storage.setItem(PRODUCT_EVENT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function captureSupportDiagnostics(input: {
  trace: TraceSummary | null;
  selectedStepId: string | null;
  mode: string;
  workspaceId: string;
  workspaceRole: string;
  safeExport: boolean;
  notifications: Array<{ message: string; level: string }>;
  actions: AsyncActionRecord[];
  stepCount: number;
}): Record<string, unknown> {
  return {
    capturedAt: new Date().toISOString(),
    app: 'agent-director',
    mode: input.mode,
    traceId: input.trace?.id ?? null,
    traceStatus: input.trace?.status ?? null,
    stepCount: input.stepCount,
    selectedStepId: input.selectedStepId,
    workspaceId: input.workspaceId,
    workspaceRole: input.workspaceRole,
    safeExport: input.safeExport,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    recentNotifications: input.notifications.slice(-6),
    asyncActions: input.actions.slice(0, 8),
  };
}

export function readFeatureFlags(storage: Storage): FeatureFlags {
  try {
    const parsed = JSON.parse(storage.getItem(FEATURE_FLAG_STORAGE_KEY) ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_FEATURE_FLAGS };
    const record = parsed as Record<string, unknown>;
    return {
      setupWizardV1: record.setupWizardV1 !== false,
      supportPanelV1: record.supportPanelV1 !== false,
      exportCenterV1: record.exportCenterV1 !== false,
      ownershipPanelV1: record.ownershipPanelV1 !== false,
    };
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

export function writeFeatureFlags(storage: Storage, flags: FeatureFlags): void {
  storage.setItem(FEATURE_FLAG_STORAGE_KEY, JSON.stringify(flags));
}

export function firstFailedStep(steps: StepSummary[]): StepSummary | null {
  return steps.find((step) => step.status === 'failed') ?? null;
}
