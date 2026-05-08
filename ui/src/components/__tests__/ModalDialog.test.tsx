import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ModalDialog from '../common/ModalDialog';

describe('ModalDialog', () => {
  it('closes on Escape and backdrop click', () => {
    const onClose = vi.fn();
    render(
      <ModalDialog ariaLabel="Example dialog" onClose={onClose}>
        <button type="button">Primary action</button>
      </ModalDialog>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('traps focus with Tab cycling inside the modal', () => {
    render(
      <ModalDialog ariaLabel="Focus trap dialog" onClose={vi.fn()}>
        <>
          <button type="button">First</button>
          <button type="button">Second</button>
        </>
      </ModalDialog>
    );

    const first = screen.getByRole('button', { name: 'First' });
    const second = screen.getByRole('button', { name: 'Second' });
    first.focus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(second).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(second).toHaveFocus();
  });

  it('does not steal focus when a caller focuses a control before autofocus runs', async () => {
    vi.useFakeTimers();

    render(
      <ModalDialog ariaLabel="Confirm action" onClose={vi.fn()}>
        <>
          <button type="button">Cancel</button>
          <button type="button">Confirm</button>
        </>
      </ModalDialog>
    );

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    confirm.focus();
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(confirm).toHaveFocus();
    vi.useRealTimers();
  });
});
