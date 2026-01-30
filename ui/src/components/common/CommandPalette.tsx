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

const normalize = (value: string) => value.trim().toLowerCase();

function buildGroupedActions(actions: CommandAction[]) {
  const grouped = new Map<string, CommandAction[]>();
  actions.forEach((action) => {
    const group = action.group ?? 'General';
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)?.push(action);
  });
  return grouped;
}

function findNextEnabledIndex(actions: CommandAction[], start: number, direction: 1 | -1) {
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

  const grouped = useMemo(() => buildGroupedActions(filtered), [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [activeIndex, filtered.length]);

  if (!open) return null;

  const runAction = (action: CommandAction) => {
    if (action.disabled) return;
    action.onTrigger();
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => findNextEnabledIndex(filtered, prev, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => findNextEnabledIndex(filtered, prev, -1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const action = filtered[activeIndex];
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

  const activeActionId = filtered[activeIndex]?.id ? `palette-option-${filtered[activeIndex]?.id}` : undefined;

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
        <div className="palette-list" role="listbox" id="command-palette-list">
          {filtered.length === 0 ? <div className="palette-empty">No matching commands.</div> : null}
          {Array.from(grouped.entries()).map(([group, groupActions]) => (
            <div key={group} className="palette-group">
              <div className="palette-group-title">{group}</div>
              <div className="palette-group-list">
                {groupActions.map((action) => {
                  currentIndex += 1;
                  const isActive = currentIndex === activeIndex;
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
                      {action.keys ? <div className="palette-item-keys">{action.keys}</div> : null}
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
