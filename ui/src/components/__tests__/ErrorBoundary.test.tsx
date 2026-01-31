import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary, { withErrorBoundary } from '../common/ErrorBoundary';

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content rendered successfully</div>;
}


describe('ErrorBoundary', () => {
  const mockOnError = vi.fn();
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error boundary console errors in tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders default error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('passes error message to onError callback', () => {
    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const [error] = mockOnError.mock.calls[0];
    expect(error.message).toBe('Test error message');
  });

  it('renders Try again button in default error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders Reload page button in default error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('resets error state when Try again is clicked', () => {
    let shouldThrow = true;

    function ToggleableThrowingComponent() {
      if (shouldThrow) {
        throw new Error('Toggleable error');
      }
      return <div>Recovered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <ToggleableThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error before retrying
    shouldThrow = false;

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered successfully')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows generic error message when error has no message', () => {
    function NoMessageErrorComponent(): JSX.Element {
      throw new Error();
    }

    render(
      <ErrorBoundary>
        <NoMessageErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('logs error to console with boundary name when provided', () => {
    render(
      <ErrorBoundary name="TestBoundary">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary:TestBoundary]',
      expect.any(Error),
      expect.anything()
    );
  });

  it('logs error to console without name when not provided', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary]',
      expect.any(Error),
      expect.anything()
    );
  });

  it('renders error boundary icon', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const icon = document.querySelector('.error-boundary-icon svg');
    expect(icon).toBeInTheDocument();
  });

  it('applies correct CSS classes to error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(document.querySelector('.error-boundary')).toBeInTheDocument();
    expect(document.querySelector('.error-boundary-content')).toBeInTheDocument();
    expect(document.querySelector('.error-boundary-title')).toBeInTheDocument();
    expect(document.querySelector('.error-boundary-message')).toBeInTheDocument();
    expect(document.querySelector('.error-boundary-actions')).toBeInTheDocument();
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      function SimpleComponent() {
        return <div>Simple content</div>;
      }

      const WrappedComponent = withErrorBoundary(SimpleComponent);

      render(<WrappedComponent />);

      expect(screen.getByText('Simple content')).toBeInTheDocument();
    });

    it('catches errors from wrapped component', () => {
      const WrappedThrowingComponent = withErrorBoundary(ThrowingComponent);

      render(<WrappedThrowingComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('passes props to wrapped component', () => {
      function PropsComponent({ message }: { message: string }) {
        return <div>{message}</div>;
      }

      const WrappedComponent = withErrorBoundary(PropsComponent);

      render(<WrappedComponent message="Hello from props" />);

      expect(screen.getByText('Hello from props')).toBeInTheDocument();
    });

    it('uses provided name in error logging', () => {
      const WrappedThrowingComponent = withErrorBoundary(ThrowingComponent, 'NamedBoundary');

      render(<WrappedThrowingComponent />);

      expect(console.error).toHaveBeenCalledWith(
        '[ErrorBoundary:NamedBoundary]',
        expect.any(Error),
        expect.anything()
      );
    });

    it('handles component without throwing', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('Child content rendered successfully')).toBeInTheDocument();
    });
  });

  describe('Reload page button', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, reload: vi.fn() },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('reloads page when Reload page button is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });
});
