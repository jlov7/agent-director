import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import IntroOverlay from '../common/IntroOverlay';

describe('IntroOverlay', () => {
  const mockOnComplete = vi.fn();
  const mockOnStartTour = vi.fn();
  const mockOnStartStory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the intro overlay with correct content', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Agent Director')).toBeInTheDocument();
    expect(screen.getByText('Watch your agent think. Then direct it.')).toBeInTheDocument();
  });

  it('displays the three intro steps', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    expect(screen.getByText('Observe')).toBeInTheDocument();
    expect(screen.getByText('Scrub the timeline to feel pacing and parallelism.')).toBeInTheDocument();

    expect(screen.getByText('Inspect')).toBeInTheDocument();
    expect(screen.getByText('Open the bottleneck to read payloads and costs.')).toBeInTheDocument();

    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText('Replay from a decisive step and compare runs.')).toBeInTheDocument();
  });

  it('does not auto-complete without explicit user action', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    expect(mockOnComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });


  it('calls onComplete when Skip intro button is clicked', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onStartTour and onComplete when Start guided tour is clicked', () => {
    render(
      <IntroOverlay
        onComplete={mockOnComplete}
        onStartTour={mockOnStartTour}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start guided tour' }));

    expect(mockOnStartTour).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onStartTour even when handler is not provided', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    // Should not throw when onStartTour is not provided
    fireEvent.click(screen.getByRole('button', { name: 'Start guided tour' }));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('shows Play story mode button when onStartStory is provided', () => {
    render(
      <IntroOverlay
        onComplete={mockOnComplete}
        onStartStory={mockOnStartStory}
      />
    );

    expect(screen.getByRole('button', { name: 'Play story mode' })).toBeInTheDocument();
  });

  it('hides Play story mode button when onStartStory is not provided', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    expect(screen.queryByRole('button', { name: 'Play story mode' })).not.toBeInTheDocument();
  });

  it('calls onStartStory and onComplete when Play story mode is clicked', () => {
    render(
      <IntroOverlay
        onComplete={mockOnComplete}
        onStartStory={mockOnStartStory}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play story mode' }));

    expect(mockOnStartStory).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<IntroOverlay onComplete={mockOnComplete} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Agent Director intro');
  });

  it('renders the scan and grid visual elements', () => {
    const { container } = render(<IntroOverlay onComplete={mockOnComplete} />);

    expect(container.querySelector('.intro-scan')).toBeInTheDocument();
    expect(container.querySelector('.intro-grid')).toBeInTheDocument();
  });

  it('supports selecting an onboarding persona before starting', () => {
    const onPersonaChange = vi.fn();
    render(<IntroOverlay onComplete={mockOnComplete} onPersonaChange={onPersonaChange} persona="builder" />);

    fireEvent.click(screen.getByRole('button', { name: 'Executive lens' }));
    expect(onPersonaChange).toHaveBeenCalledWith('executive');
  });

  it('supports launch path selection and start action', () => {
    const onLaunchPathChange = vi.fn();
    const onStartLaunchPath = vi.fn();
    render(
      <IntroOverlay
        onComplete={mockOnComplete}
        launchPath="rapid_triage"
        onLaunchPathChange={onLaunchPathChange}
        onStartLaunchPath={onStartLaunchPath}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deep diagnosis' }));
    expect(onLaunchPathChange).toHaveBeenCalledWith('deep_diagnosis');

    fireEvent.click(screen.getByRole('button', { name: 'Start Team sync' }));
    expect(onStartLaunchPath).toHaveBeenCalledWith('team_sync');
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
