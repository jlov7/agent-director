import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommandPalette, { type CommandAction } from '../common/CommandPalette';

const mockActions: CommandAction[] = [
  { id: 'action1', label: 'Open Settings', description: 'Configure application', group: 'General', keys: 'Cmd+,', onTrigger: vi.fn() },
  { id: 'action2', label: 'Search Files', description: 'Find files in project', group: 'General', keys: 'Cmd+P', onTrigger: vi.fn() },
  { id: 'action3', label: 'Toggle Theme', description: 'Switch between light and dark', group: 'Appearance', onTrigger: vi.fn() },
  { id: 'action4', label: 'Disabled Action', description: 'This is disabled', group: 'General', disabled: true, onTrigger: vi.fn() },
  { id: 'action5', label: 'Start Playback', group: 'Playback', onTrigger: vi.fn() },
];

describe('CommandPalette', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockActions.forEach(action => {
      (action.onTrigger as ReturnType<typeof vi.fn>).mockClear();
    });
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <CommandPalette open={false} onClose={mockOnClose} actions={mockActions} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the palette when open is true', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Command palette')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type to filter actions…')).toBeInTheDocument();
  });

  it('displays all actions grouped by category', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Playback')).toBeInTheDocument();
    expect(screen.getByText('Open Settings')).toBeInTheDocument();
    expect(screen.getByText('Search Files')).toBeInTheDocument();
    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
  });

  it('displays action descriptions when provided', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    expect(screen.getByText('Configure application')).toBeInTheDocument();
    expect(screen.getByText('Find files in project')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts when provided', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    expect(screen.getByText('Cmd+,')).toBeInTheDocument();
    expect(screen.getByText('Cmd+P')).toBeInTheDocument();
  });

  it('filters actions based on search query', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const input = screen.getByPlaceholderText('Type to filter actions…');
    fireEvent.change(input, { target: { value: 'settings' } });

    expect(screen.getByText('Open Settings')).toBeInTheDocument();
    expect(screen.queryByText('Search Files')).not.toBeInTheDocument();
    expect(screen.queryByText('Toggle Theme')).not.toBeInTheDocument();
  });

  it('shows no matching commands message when filter has no results', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const input = screen.getByPlaceholderText('Type to filter actions…');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matching commands.')).toBeInTheDocument();
  });

  it('filters by description text', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const input = screen.getByPlaceholderText('Type to filter actions…');
    fireEvent.change(input, { target: { value: 'configure' } });

    expect(screen.getByText('Open Settings')).toBeInTheDocument();
  });

  it('filters by group name', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const input = screen.getByPlaceholderText('Type to filter actions…');
    fireEvent.change(input, { target: { value: 'appearance' } });

    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    expect(screen.queryByText('Open Settings')).not.toBeInTheDocument();
  });

  it('triggers action when clicked and closes palette', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    fireEvent.click(screen.getByText('Open Settings'));

    expect(mockActions[0].onTrigger).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger disabled action when clicked', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    fireEvent.click(screen.getByText('Disabled Action'));

    expect(mockActions[3].onTrigger).not.toHaveBeenCalled();
  });

  it('calls onClose when Close button is clicked', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close command palette' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const backdrop = document.querySelector('.palette-backdrop');
    fireEvent.mouseDown(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('navigates with ArrowDown key', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const dialog = screen.getByRole('dialog');

    // First item should be active by default
    const firstItem = screen.getByText('Open Settings').closest('button');
    expect(firstItem).toHaveClass('active');

    fireEvent.keyDown(dialog, { key: 'ArrowDown' });

    const secondItem = screen.getByText('Search Files').closest('button');
    expect(secondItem).toHaveClass('active');
  });

  it('navigates with ArrowUp key', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const dialog = screen.getByRole('dialog');

    // Move down first
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });

    // Now move up
    fireEvent.keyDown(dialog, { key: 'ArrowUp' });

    const secondItem = screen.getByText('Search Files').closest('button');
    expect(secondItem).toHaveClass('active');
  });

  it('wraps around when navigating past last item', async () => {
    // Test with a smaller set of actions for predictable wrapping
    const simpleActions: CommandAction[] = [
      { id: 'a1', label: 'First', onTrigger: vi.fn() },
      { id: 'a2', label: 'Second', onTrigger: vi.fn() },
    ];
    render(<CommandPalette open={true} onClose={mockOnClose} actions={simpleActions} />);

    const dialog = screen.getByRole('dialog');
    const input = screen.getByRole('combobox');

    // Initially at first item
    expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-a1');

    // Navigate down twice to wrap
    fireEvent.keyDown(dialog, { key: 'ArrowDown' }); // to a2
    fireEvent.keyDown(dialog, { key: 'ArrowDown' }); // wrap to a1

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-a1');
    });
  });

  it('triggers action with Enter key', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });

    expect(mockActions[0].onTrigger).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('skips disabled items when navigating', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const dialog = screen.getByRole('dialog');

    // Navigate past the disabled item (action4 is at index 3)
    fireEvent.keyDown(dialog, { key: 'ArrowDown' }); // to action2
    fireEvent.keyDown(dialog, { key: 'ArrowDown' }); // to action3
    fireEvent.keyDown(dialog, { key: 'ArrowDown' }); // should skip action4, go to action5

    const playbackItem = screen.getByText('Start Playback').closest('button');
    expect(playbackItem).toHaveClass('active');
  });

  it('updates active item on mouse enter', async () => {
    // Use simple actions to test mouse enter behavior
    const simpleActions: CommandAction[] = [
      { id: 'a1', label: 'First', onTrigger: vi.fn() },
      { id: 'a2', label: 'Second', onTrigger: vi.fn() },
    ];
    render(<CommandPalette open={true} onClose={mockOnClose} actions={simpleActions} />);

    // Initially first action is active and has aria-selected true
    const firstOption = screen.getByRole('option', { name: /First/i });
    expect(firstOption).toHaveAttribute('aria-selected', 'true');

    // Mouse enter on second item
    const secondOption = screen.getByRole('option', { name: /Second/i });
    fireEvent.mouseEnter(secondOption);

    // Check that second item becomes active
    await waitFor(() => {
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
      expect(firstOption).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('resets query and index when reopened', async () => {
    const { rerender } = render(
      <CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />
    );

    const input = screen.getByPlaceholderText('Type to filter actions…');
    fireEvent.change(input, { target: { value: 'theme' } });

    // Close and reopen
    rerender(<CommandPalette open={false} onClose={mockOnClose} actions={mockActions} />);
    rerender(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    await waitFor(() => {
      const newInput = screen.getByPlaceholderText('Type to filter actions…');
      expect(newInput).toHaveValue('');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Command palette');

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', 'command-palette-list');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('id', 'command-palette-list');
  });

  it('sets aria-activedescendant correctly', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-action1');

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });

    expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-action2');
  });

  it('marks options with aria-selected', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    const firstOption = screen.getByRole('option', { name: /Open Settings/i });
    expect(firstOption).toHaveAttribute('aria-selected', 'true');

    const secondOption = screen.getByRole('option', { name: /Search Files/i });
    expect(secondOption).toHaveAttribute('aria-selected', 'false');
  });

  it('pins an action and shows it in the pinned section', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);

    fireEvent.click(screen.getByLabelText('Pin Open Settings'));
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByLabelText('Unpin Open Settings')).toBeInTheDocument();
  });

  it('records recently triggered actions', () => {
    const { rerender } = render(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);
    fireEvent.click(screen.getByText('Search Files'));

    rerender(<CommandPalette open={false} onClose={mockOnClose} actions={mockActions} />);
    rerender(<CommandPalette open={true} onClose={mockOnClose} actions={mockActions} />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Search Files')).toBeInTheDocument();
  });
});
