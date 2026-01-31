import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuidedTour, { type TourStep } from '../common/GuidedTour';

const mockSteps: TourStep[] = [
  { id: 'step1', title: 'Welcome', body: 'Welcome to the tour', target: '#target1' },
  { id: 'step2', title: 'Features', body: 'Check out features', target: '#target2' },
  { id: 'step3', title: 'Finish', body: 'You are done', target: '#target3', placement: 'top' },
];

describe('GuidedTour', () => {
  let targetElement: HTMLDivElement;
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    targetElement = document.createElement('div');
    targetElement.id = 'target1';
    targetElement.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      bottom: 150,
      right: 200,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));
    document.body.appendChild(targetElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <GuidedTour
        steps={mockSteps}
        open={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the tour overlay when open is true', () => {
    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the tour')).toBeInTheDocument();
  });

  it('displays correct step counter', () => {
    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('navigates to next step when Next button is clicked', () => {
    // Add target2 element
    const target2 = document.createElement('div');
    target2.id = 'target2';
    target2.getBoundingClientRect = vi.fn(() => ({
      top: 200,
      left: 200,
      bottom: 250,
      right: 300,
      width: 100,
      height: 50,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target2);

    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('disables Back button on first step', () => {
    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const backButton = screen.getByRole('button', { name: 'Back' });
    expect(backButton).toBeDisabled();
  });

  it('enables Back button on subsequent steps', () => {
    // Add target2 element
    const target2 = document.createElement('div');
    target2.id = 'target2';
    target2.getBoundingClientRect = vi.fn(() => ({
      top: 200,
      left: 200,
      bottom: 250,
      right: 300,
      width: 100,
      height: 50,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target2);

    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const backButton = screen.getByRole('button', { name: 'Back' });
    expect(backButton).not.toBeDisabled();
  });

  it('navigates back when Back button is clicked', () => {
    // Add target2 element
    const target2 = document.createElement('div');
    target2.id = 'target2';
    target2.getBoundingClientRect = vi.fn(() => ({
      top: 200,
      left: 200,
      bottom: 250,
      right: 300,
      width: 100,
      height: 50,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target2);

    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Go to step 2
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Features')).toBeInTheDocument();

    // Go back to step 1
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('calls onClose when Skip button is clicked', () => {
    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const backdrop = document.querySelector('.tour-backdrop');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows Finish tour button on last step', () => {
    // Add all target elements
    const target2 = document.createElement('div');
    target2.id = 'target2';
    target2.getBoundingClientRect = vi.fn(() => ({
      top: 200, left: 200, bottom: 250, right: 300, width: 100, height: 50, x: 200, y: 200,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target2);

    const target3 = document.createElement('div');
    target3.id = 'target3';
    target3.getBoundingClientRect = vi.fn(() => ({
      top: 300, left: 300, bottom: 350, right: 400, width: 100, height: 50, x: 300, y: 300,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target3);

    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Navigate to last step
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish tour' })).toBeInTheDocument();
  });

  it('calls onComplete when Finish tour button is clicked', () => {
    // Add all target elements
    const target2 = document.createElement('div');
    target2.id = 'target2';
    target2.getBoundingClientRect = vi.fn(() => ({
      top: 200, left: 200, bottom: 250, right: 300, width: 100, height: 50, x: 200, y: 200,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target2);

    const target3 = document.createElement('div');
    target3.id = 'target3';
    target3.getBoundingClientRect = vi.fn(() => ({
      top: 300, left: 300, bottom: 350, right: 400, width: 100, height: 50, x: 300, y: 300,
      toJSON: () => ({}),
    }));
    document.body.appendChild(target3);

    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Navigate to last step
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.click(screen.getByRole('button', { name: 'Finish tour' }));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(
      <GuidedTour
        steps={mockSteps}
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Guided tour');
  });
});
