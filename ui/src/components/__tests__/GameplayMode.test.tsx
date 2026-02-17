import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import GameplayMode from '../GameplayMode';
import { createInitialGameplayState } from '../../utils/gameplayEngine';

function Harness() {
  const [state, setState] = useState(() => createInitialGameplayState('trace-1'));
  return <GameplayMode state={state} playheadMs={5000} onUpdate={(updater) => setState((prev) => updater(prev))} />;
}

describe('GameplayMode', () => {
  it('renders gameplay command center and completion summary', () => {
    render(<Harness />);
    expect(screen.getByText('Gameplay Command Center')).toBeInTheDocument();
    expect(screen.getByLabelText('Gameplay completion')).toBeInTheDocument();
    expect(screen.getByText(/Core Loop \+ Outcomes/i)).toBeInTheDocument();
    expect(screen.getByText(/Level 1/i)).toBeInTheDocument();
  });

  it('adds a raid member and advances campaign', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Raid member name'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(screen.getByText('Party: 2 members')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mission success' }));
    expect(screen.getByText(/^Depth 2 .*Lives 3$/i)).toBeInTheDocument();
  });

  it('supports liveops weekly rotation', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByText(/Week 2/i)).toBeInTheDocument();
  });

  it('applies liveops balancing and creates a tuning entry', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('LiveOps difficulty factor'), { target: { value: '1.4' } });
    fireEvent.change(screen.getByLabelText('LiveOps reward multiplier'), { target: { value: '1.6' } });
    fireEvent.change(screen.getByLabelText('LiveOps tuning note'), { target: { value: 'Ops hotfix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply balancing' }));
    expect(screen.getByText(/Ops hotfix/i)).toBeInTheDocument();
    expect(screen.getByText(/Difficulty x1\.40/i)).toBeInTheDocument();
  });

  it('tracks safety moderation actions', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Safety player id'), { target: { value: 'griefer-9' } });
    fireEvent.change(screen.getByLabelText('Safety reason'), { target: { value: 'Abuse in chat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mute player' }));
    fireEvent.click(screen.getByRole('button', { name: 'Report player' }));
    expect(screen.getByText(/Muted 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Abuse in chat/i)).toBeInTheDocument();
  });

  it('toggles sandbox mode from core loop card', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable sandbox' }));
    expect(screen.getByText(/Sandbox ON/i)).toBeInTheDocument();
  });

  it('shows skill unlock gating feedback', () => {
    render(<Harness />);
    expect(screen.getByText(/Requires: skill-focus/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock Focus Matrix' }));
    expect(screen.getByText(/Requires level 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mission success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mission success' }));
    expect(screen.getByRole('button', { name: 'Unlock Surge Compiler' })).not.toBeDisabled();
  });

  it('supports reward cadence claim actions', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Claim daily' }));
    expect(screen.getByText(/Reward cadence: streak 1/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mission success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Claim session' }));
    expect(screen.getByText(/session claimed/i)).toBeInTheDocument();
  });

  it('shows boss phase mechanics and vulnerability', () => {
    render(<Harness />);
    expect(screen.getByText(/Phase 1: Shield lattice destabilization/i)).toBeInTheDocument();
    expect(screen.getByText(/Current vulnerability: exploit/i)).toBeInTheDocument();
  });

  it('shows deterministic mission seed metadata in campaign card', () => {
    render(<Harness />);
    expect(screen.getByText(/Mission seed/i)).toBeInTheDocument();
    expect(screen.getByText(/seed=.*depth=1/i)).toBeInTheDocument();
  });

  it('supports team ping intents and friend invites in local mode', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Ping intent'), { target: { value: 'assist' } });
    fireEvent.change(screen.getByLabelText('Ping objective id'), { target: { value: 'obj-root-cause' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send ping' }));
    expect(screen.getByText('obj-root-cause')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Friend player id'), { target: { value: 'ally' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invite friend' }));
    expect(screen.getByText(/Outgoing 1/i)).toBeInTheDocument();
  });

  it('exposes locale and gamepad controls with retry action', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Gameplay locale')).toBeInTheDocument();
    expect(screen.getByLabelText('Gamepad preset')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disable gamepad controls/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry sync/i })).toBeInTheDocument();
  });
});
