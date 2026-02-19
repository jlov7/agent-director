export const REMAPPABLE_SHORTCUTS = [
  { id: 'toggleStory', label: 'Story mode', defaultKey: 's' },
  { id: 'toggleExplain', label: 'Explain mode', defaultKey: 'e' },
  { id: 'startTour', label: 'Start guided tour', defaultKey: 't' },
  { id: 'toggleFlow', label: 'Toggle Flow mode', defaultKey: 'f' },
  { id: 'toggleCinema', label: 'Switch to Cinema mode', defaultKey: 'c' },
  { id: 'toggleGameplay', label: 'Switch to Gameplay mode', defaultKey: 'g' },
  { id: 'toggleInspector', label: 'Toggle inspector', defaultKey: 'i' },
] as const;

export type RemappableShortcutId = (typeof REMAPPABLE_SHORTCUTS)[number]['id'];
export type ShortcutBindings = Record<RemappableShortcutId, string>;

export const SHORTCUT_KEY_OPTIONS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const DEFAULT_SHORTCUT_BINDINGS_INTERNAL = REMAPPABLE_SHORTCUTS.reduce((acc, shortcut) => {
  acc[shortcut.id] = shortcut.defaultKey;
  return acc;
}, {} as ShortcutBindings);

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = { ...DEFAULT_SHORTCUT_BINDINGS_INTERNAL };

function sanitizeKey(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (SHORTCUT_KEY_OPTIONS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function firstAvailableKey(used: Set<string>): string {
  const next = SHORTCUT_KEY_OPTIONS.find((key) => !used.has(key));
  return next ?? 'z';
}

export function normalizeShortcutBindings(bindings: Partial<ShortcutBindings> | null | undefined): ShortcutBindings {
  const normalized = {} as ShortcutBindings;
  const used = new Set<string>();

  for (const shortcut of REMAPPABLE_SHORTCUTS) {
    const candidate = sanitizeKey(bindings?.[shortcut.id], shortcut.defaultKey);
    const key = used.has(candidate) ? firstAvailableKey(used) : candidate;
    normalized[shortcut.id] = key;
    used.add(key);
  }

  return normalized;
}

export function setShortcutBinding(
  bindings: Partial<ShortcutBindings> | null | undefined,
  id: RemappableShortcutId,
  nextKey: string
): ShortcutBindings {
  const current = normalizeShortcutBindings(bindings);
  const normalizedNextKey = sanitizeKey(nextKey, current[id]);
  if (current[id] === normalizedNextKey) {
    return current;
  }

  const next = { ...current, [id]: normalizedNextKey };
  const conflict = REMAPPABLE_SHORTCUTS.find(
    (shortcut) => shortcut.id !== id && next[shortcut.id] === normalizedNextKey
  );
  if (conflict) {
    next[conflict.id] = current[id];
  }
  return normalizeShortcutBindings(next);
}

export function formatShortcutKey(key: string): string {
  return key.trim().toUpperCase();
}
