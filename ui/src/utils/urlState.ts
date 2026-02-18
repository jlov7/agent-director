const VALID_MODES = new Set(['cinema', 'flow', 'compare', 'matrix', 'gameplay']);

export interface UrlAppState {
  mode?: 'cinema' | 'flow' | 'compare' | 'matrix' | 'gameplay';
  traceId?: string;
  stepId?: string;
}

function normalizeToken(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function parseUrlAppState(search: string): UrlAppState {
  const params = new URLSearchParams(search);
  const modeToken = normalizeToken(params.get('mode'));
  const traceToken = normalizeToken(params.get('trace'));
  const stepToken = normalizeToken(params.get('step'));

  const state: UrlAppState = {};
  if (modeToken && VALID_MODES.has(modeToken)) {
    state.mode = modeToken as UrlAppState['mode'];
  }
  if (traceToken) state.traceId = traceToken;
  if (stepToken) state.stepId = stepToken;
  return state;
}

export function buildUrlAppState(currentHref: string, state: UrlAppState): string {
  const url = new URL(currentHref);

  if (state.mode) {
    url.searchParams.set('mode', state.mode);
  } else {
    url.searchParams.delete('mode');
  }

  if (state.traceId) {
    url.searchParams.set('trace', state.traceId);
  } else {
    url.searchParams.delete('trace');
  }

  if (state.stepId) {
    url.searchParams.set('step', state.stepId);
  } else {
    url.searchParams.delete('step');
  }

  return url.toString();
}
