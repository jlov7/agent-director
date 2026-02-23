import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
