import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroRibbon from '../common/HeroRibbon';

describe('HeroRibbon', () => {
  const mockOnStartTour = vi.fn();
  const mockOnStartStory = vi.fn();
  const mockOnToggleExplain = vi.fn();
  const mockOnDismiss = vi.fn();

  const defaultProps = {
    explainMode: false,
    storyActive: false,
    onStartTour: mockOnStartTour,
    onStartStory: mockOnStartStory,
    onToggleExplain: mockOnToggleExplain,
    onDismiss: mockOnDismiss,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero ribbon with correct content', () => {
    render(<HeroRibbon {...defaultProps} />);

    expect(screen.getByText('Director briefing')).toBeInTheDocument();
    expect(screen.getByText('Observe. Inspect. Direct.')).toBeInTheDocument();
    expect(screen.getByText(/cinematic control room/)).toBeInTheDocument();
  });

  it('displays all three hero pills', () => {
    render(<HeroRibbon {...defaultProps} />);

    const pills = screen.getAllByText(/Observe|Inspect|Direct/);
    // There are pills and also the title contains these words
    expect(pills.length).toBeGreaterThanOrEqual(3);
  });

  it('renders all action buttons', () => {
    render(<HeroRibbon {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Start guided tour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play story mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explain/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('calls onStartTour when Start guided tour button is clicked', () => {
    render(<HeroRibbon {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start guided tour' }));

    expect(mockOnStartTour).toHaveBeenCalledTimes(1);
  });

  it('calls onStartStory when Play story mode button is clicked', () => {
    render(<HeroRibbon {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play story mode' }));

    expect(mockOnStartStory).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleExplain when Explain button is clicked', () => {
    render(<HeroRibbon {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Explain/ }));

    expect(mockOnToggleExplain).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Dismiss button is clicked', () => {
    render(<HeroRibbon {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows "Explain Off" when explainMode is false', () => {
    render(<HeroRibbon {...defaultProps} explainMode={false} />);

    expect(screen.getByRole('button', { name: 'Explain Off' })).toBeInTheDocument();
  });

  it('shows "Explain On" when explainMode is true', () => {
    render(<HeroRibbon {...defaultProps} explainMode={true} />);

    expect(screen.getByRole('button', { name: 'Explain On' })).toBeInTheDocument();
  });

  it('sets aria-pressed correctly based on explainMode', () => {
    const { rerender } = render(<HeroRibbon {...defaultProps} explainMode={false} />);

    const explainButton = screen.getByRole('button', { name: /Explain/ });
    expect(explainButton).toHaveAttribute('aria-pressed', 'false');

    rerender(<HeroRibbon {...defaultProps} explainMode={true} />);
    expect(explainButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds active class to Explain button when explainMode is true', () => {
    render(<HeroRibbon {...defaultProps} explainMode={true} />);

    const explainButton = screen.getByRole('button', { name: /Explain/ });
    expect(explainButton).toHaveClass('active');
  });

  it('disables Play story mode button when storyActive is true', () => {
    render(<HeroRibbon {...defaultProps} storyActive={true} />);

    const storyButton = screen.getByRole('button', { name: 'Story running' });
    expect(storyButton).toBeDisabled();
  });

  it('shows "Play story mode" when storyActive is false', () => {
    render(<HeroRibbon {...defaultProps} storyActive={false} />);

    expect(screen.getByRole('button', { name: 'Play story mode' })).toBeInTheDocument();
  });

  it('shows "Story running" when storyActive is true', () => {
    render(<HeroRibbon {...defaultProps} storyActive={true} />);

    expect(screen.getByRole('button', { name: 'Story running' })).toBeInTheDocument();
  });

  it('has proper accessibility attributes on the section', () => {
    render(<HeroRibbon {...defaultProps} />);

    const section = screen.getByRole('region', { name: 'Director briefing' });
    expect(section).toHaveAttribute('aria-label', 'Director briefing');
  });

  it('includes data-tour attribute for tour integration', () => {
    render(<HeroRibbon {...defaultProps} />);

    const section = screen.getByRole('region', { name: 'Director briefing' });
    expect(section).toHaveAttribute('data-tour', 'hero');
  });

  it('includes data-help attributes for explain mode', () => {
    render(<HeroRibbon {...defaultProps} />);

    const section = screen.getByRole('region', { name: 'Director briefing' });
    expect(section).toHaveAttribute('data-help');
    expect(section).toHaveAttribute('data-help-indicator');
    expect(section).toHaveAttribute('data-help-title', 'Director briefing');
    expect(section).toHaveAttribute('data-help-placement', 'bottom');
  });
});
