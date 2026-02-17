export const GAMEPLAY_FUNNEL_STORAGE_KEY = 'agentDirector.gameplayFunnel.v1';

export const GAMEPLAY_FUNNEL_EVENT_NAMES = [
  'funnel.session_start',
  'funnel.first_objective_progress',
  'funnel.first_mission_outcome',
  'funnel.run_outcome',
  'funnel.tutorial_start',
  'funnel.tutorial_skip',
  'funnel.tutorial_complete',
] as const;

export type GameplayFunnelEventName = (typeof GAMEPLAY_FUNNEL_EVENT_NAMES)[number];

export type GameplayFunnelEvent = {
  name: GameplayFunnelEventName;
  at: number;
  metadata: Record<string, unknown>;
};

export function readGameplayFunnelEvents(): GameplayFunnelEvent[] {
  try {
    const raw = window.localStorage.getItem(GAMEPLAY_FUNNEL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event): event is GameplayFunnelEvent => {
      if (!event || typeof event !== 'object') return false;
      const candidate = event as GameplayFunnelEvent;
      return (
        typeof candidate.name === 'string' &&
        typeof candidate.at === 'number' &&
        Boolean(candidate.metadata) &&
        typeof candidate.metadata === 'object'
      );
    });
  } catch {
    return [];
  }
}

export function recordGameplayFunnelEvent(
  name: GameplayFunnelEventName,
  metadata: Record<string, unknown> = {}
): GameplayFunnelEvent {
  const next: GameplayFunnelEvent = {
    name,
    at: Date.now(),
    metadata,
  };
  const prior = readGameplayFunnelEvents();
  const events = [...prior, next].slice(-200);
  window.localStorage.setItem(GAMEPLAY_FUNNEL_STORAGE_KEY, JSON.stringify(events));
  return next;
}
