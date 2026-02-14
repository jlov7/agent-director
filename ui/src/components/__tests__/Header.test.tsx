import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../Header';
import type { TraceSummary } from '../../types';

const trace: TraceSummary = {
  id: 'trace-1',
  name: 'Demo Trace',
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: '2026-01-01T00:00:10.000Z',
  status: 'completed',
  metadata: {
    source: 'manual',
    agentName: 'Demo Agent',
    modelId: 'demo-model',
    wallTimeMs: 10000,
  },
  steps: [],
};

describe('Header', () => {
  it('renders a Help link to the docs/help page', () => {
    render(<Header trace={trace} />);

    const helpLink = screen.getByRole('link', { name: 'Help' });
    expect(helpLink).toHaveAttribute('href', '/help.html');
    expect(helpLink).toHaveAttribute('target', '_blank');
    expect(helpLink).toHaveAttribute('rel', 'noreferrer');
  });
});
