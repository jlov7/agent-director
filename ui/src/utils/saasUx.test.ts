import { describe, expect, it } from 'vitest';
import {
  appendProductEvent,
  captureSupportDiagnostics,
  DEFAULT_FEATURE_FLAGS,
  mergeAsyncAction,
  readFeatureFlags,
  readProductEvents,
  validateSetupWizardDraft,
  writeFeatureFlags,
  type AsyncActionRecord,
} from './saasUx';

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    length: 0,
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  } as Storage;
}

describe('saasUx utils', () => {
  it('validates setup wizard draft', () => {
    const invalid = validateSetupWizardDraft({ dataSource: '', importPath: '', inviteEmails: 'ops@example,ok@example.com' });
    expect(invalid.isValid).toBe(false);
    expect(invalid.dataSourceError).toBeTruthy();
    expect(invalid.importPathError).toBeTruthy();
    expect(invalid.inviteEmailsError).toContain('ops@example');

    const valid = validateSetupWizardDraft({
      dataSource: 'api',
      importPath: '/tmp/import.json',
      inviteEmails: 'ops@example.com, qa@example.com',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.dataSourceError).toBeNull();
    expect(valid.importPathError).toBeNull();
    expect(valid.inviteEmailsError).toBeNull();
  });

  it('merges async actions by id and keeps latest order', () => {
    const initial: AsyncActionRecord[] = [];
    const added = mergeAsyncAction(initial, {
      id: 'run-matrix',
      label: 'Run matrix',
      status: 'running',
      detail: 'In progress',
      updatedAt: 1,
    });
    expect(added).toHaveLength(1);

    const updated = mergeAsyncAction(added, {
      id: 'run-matrix',
      label: 'Run matrix',
      status: 'error',
      detail: 'Timed out',
      updatedAt: 2,
      retryable: true,
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]?.status).toBe('error');
    expect(updated[0]?.retryable).toBe(true);
  });

  it('appends and reads product events with cap', () => {
    const storage = makeStorage();
    appendProductEvent(storage, { name: 'ux.setup.opened', at: '2026-01-01T00:00:00.000Z', metadata: {} });
    appendProductEvent(storage, { name: 'ux.setup.completed', at: '2026-01-01T00:00:01.000Z', metadata: { ok: true } });

    const events = readProductEvents(storage);
    expect(events).toHaveLength(2);
    expect(events[1]?.name).toBe('ux.setup.completed');
  });

  it('reads and writes feature flags', () => {
    const storage = makeStorage();
    expect(readFeatureFlags(storage)).toEqual(DEFAULT_FEATURE_FLAGS);

    writeFeatureFlags(storage, {
      setupWizardV1: true,
      supportPanelV1: false,
      exportCenterV1: true,
      ownershipPanelV1: false,
    });

    expect(readFeatureFlags(storage)).toEqual({
      setupWizardV1: true,
      supportPanelV1: false,
      exportCenterV1: true,
      ownershipPanelV1: false,
    });
  });

  it('builds support diagnostics payload', () => {
    const payload = captureSupportDiagnostics({
      trace: null,
      selectedStepId: null,
      mode: 'cinema',
      workspaceId: 'personal',
      workspaceRole: 'operator',
      safeExport: true,
      notifications: [{ message: 'Hello', level: 'info' }],
      actions: [
        {
          id: 'a',
          label: 'Run',
          status: 'success',
          detail: 'Done',
          updatedAt: 1,
        },
      ],
      stepCount: 12,
    });

    expect(payload.mode).toBe('cinema');
    expect(payload.workspaceRole).toBe('operator');
    expect(Array.isArray(payload.recentNotifications)).toBe(true);
  });
});
