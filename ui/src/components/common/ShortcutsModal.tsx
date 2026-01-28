import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

type ShortcutsModalProps = {
  open: boolean;
  onClose: () => void;
};

const shortcuts = [
  { keys: 'Space', action: 'Play / pause' },
  { keys: '← / →', action: 'Step boundary back / forward' },
  { keys: 'Shift + ← / →', action: 'Jump to start / end' },
  { keys: 'F', action: 'Toggle Flow mode' },
  { keys: 'I', action: 'Toggle Inspector' },
  { keys: '?', action: 'Show shortcuts' },
  { keys: 'Esc', action: 'Close modal / inspector' },
];

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    );
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex + 1) % focusable.length;
    focusable[nextIndex]?.focus();
    event.preventDefault();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onKeyDown={handleKeyDown}
    >
      <div className="modal" tabIndex={-1}>
        <div className="modal-header">
          <div className="modal-title" id="shortcuts-title">
            Keyboard Shortcuts
          </div>
          <button className="ghost-button" type="button" onClick={onClose} ref={closeRef} aria-label="Close shortcuts">
            Close
          </button>
        </div>
        <div className="modal-body">
          {shortcuts.map((item) => (
            <div key={item.keys} className="modal-row">
              <span className="modal-keys">{item.keys}</span>
              <span className="modal-action">{item.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
