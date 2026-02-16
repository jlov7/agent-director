import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export type CommandAction = {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keys?: string;
  disabled?: boolean;
  onTrigger: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
};

type DecoratedAction = CommandAction & {
  section: string;
};

const RECENT_STORAGE_KEY = 'agentDirector.palette.recent.v1';
const PINNED_STORAGE_KEY = 'agentDirector.palette.pinned.v1';
const MAX_RECENT = 8;
const MAX_PINNED = 12;

const normalize = (value: string) => value.trim().toLowerCase();

function readStoredIds(storageKey: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function writeStoredIds(storageKey: string, ids: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}

function buildGroupedActions(actions: DecoratedAction[]) {
  const grouped = new Map<string, DecoratedAction[]>();
  actions.forEach((action) => {
    const group = action.section;
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)?.push(action);
  });
  return grouped;
}

function findNextEnabledIndex(actions: DecoratedAction[], start: number, direction: 1 | -1) {
  if (!actions.length) return 0;
  let next = start;
  for (let i = 0; i < actions.length; i += 1) {
    next = (next + direction + actions.length) % actions.length;
    if (!actions[next]?.disabled) return next;
  }
  return start;
}

export default function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return actions;
    return actions.filter((action) => {
      const haystack = [action.label, action.description, action.group, action.keys].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [actions, query]);

  const displayedActions = useMemo(() => {
    const visibleById = new Map(filtered.map((action) => [action.id, action]));
    const pinned = pinnedIds
      .map((id) => visibleById.get(id))
      .filter((action): action is CommandAction => Boolean(action))
      .map((action) => ({ ...action, section: 'Pinned' as const }));
    const recent = recentIds
      .map((id) => visibleById.get(id))
      .filter((action): action is CommandAction => Boolean(action))
      .filter((action) => !pinned.some((item) => item.id === action.id))
      .map((action) => ({ ...action, section: 'Recent' as const }));
    const base = filtered
      .filter((action) => !pinned.some((item) => item.id === action.id))
      .filter((action) => !recent.some((item) => item.id === action.id))
      .map((action) => ({ ...action, section: action.group ?? 'General' }));
    return [...pinned, ...recent, ...base];
  }, [filtered, pinnedIds, recentIds]);

  const grouped = useMemo(() => buildGroupedActions(displayedActions), [displayedActions]);

  const macroActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          (action.group ?? '').toLowerCase() === 'macros' ||
          action.id.startsWith('macro-')
      ),
    [actions]
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setRecentIds(readStoredIds(RECENT_STORAGE_KEY));
    setPinnedIds(readStoredIds(PINNED_STORAGE_KEY));
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= displayedActions.length) setActiveIndex(0);
  }, [activeIndex, displayedActions.length]);

  if (!open) return null;

  const recordRecent = (actionId: string) => {
    setRecentIds((prev) => {
      const next = [actionId, ...prev.filter((id) => id !== actionId)].slice(0, MAX_RECENT);
      writeStoredIds(RECENT_STORAGE_KEY, next);
      return next;
    });
  };

  const runAction = (action: CommandAction) => {
    if (action.disabled) return;
    recordRecent(action.id);
    action.onTrigger();
    onClose();
  };

  const togglePin = (actionId: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [actionId, ...prev].slice(0, MAX_PINNED);
      writeStoredIds(PINNED_STORAGE_KEY, next);
      return next;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => findNextEnabledIndex(displayedActions, prev, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => findNextEnabledIndex(displayedActions, prev, -1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const action = displayedActions[activeIndex];
      if (action) runAction(action);
      return;
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ??
          []
      );
      if (!focusable.length) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex + 1) % focusable.length;
      focusable[nextIndex]?.focus();
      event.preventDefault();
    }
  };

  const activeActionId = displayedActions[activeIndex]?.id
    ? `palette-option-${displayedActions[activeIndex]?.id}`
    : undefined;

  let currentIndex = -1;

  return (
    <div
      className="modal-backdrop palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" ref={panelRef}>
        <div className="palette-header">
          <div>
            <div className="palette-title">Command palette</div>
            <div className="palette-subtitle">Search actions, modes, and playbook steps.</div>
          </div>
          <button className="ghost-button" type="button" onClick={onClose} aria-label="Close command palette">
            Close
          </button>
        </div>
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type to filter actions…"
          aria-label="Search commands"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          aria-activedescendant={activeActionId}
          aria-autocomplete="list"
        />
        {!query.trim() && macroActions.length > 0 ? (
          <div className="palette-macros">
            <div className="palette-group-title">Quick macros</div>
            <div className="palette-macro-list">
              {macroActions.slice(0, 3).map((action) => (
                <button
                  key={action.id}
                  className="ghost-button palette-macro-item"
                  type="button"
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="palette-list" role="listbox" id="command-palette-list">
          {displayedActions.length === 0 ? <div className="palette-empty">No matching commands.</div> : null}
          {Array.from(grouped.entries()).map(([group, groupActions]) => (
            <div key={group} className="palette-group">
              <div className="palette-group-title">{group}</div>
              <div className="palette-group-list">
                {groupActions.map((action) => {
                  currentIndex += 1;
                  const isActive = currentIndex === activeIndex;
                  const isPinned = pinnedIds.includes(action.id);
                  return (
                    <button
                      key={action.id}
                      id={`palette-option-${action.id}`}
                      className={`palette-item ${isActive ? 'active' : ''}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      onClick={() => runAction(action)}
                      disabled={action.disabled}
                    >
                      <div className="palette-item-main">
                        <div className="palette-item-title">{action.label}</div>
                        {action.description ? <div className="palette-item-description">{action.description}</div> : null}
                      </div>
                      <div className="palette-item-trailing">
                        {action.keys ? <div className="palette-item-keys">{action.keys}</div> : null}
                        <span
                          className={`palette-pin ${isPinned ? 'active' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            togglePin(action.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            event.stopPropagation();
                            togglePin(action.id);
                          }}
                          aria-label={isPinned ? `Unpin ${action.label}` : `Pin ${action.label}`}
                          title={isPinned ? 'Unpin command' : 'Pin command'}
                        >
                          {isPinned ? '★' : '☆'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
