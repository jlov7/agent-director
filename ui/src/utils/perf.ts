import type { UxRebootRoute } from '../routes/routeConfig';

export const ROUTE_PERF_BUDGET_MS: Record<UxRebootRoute, number> = {
  overview: 1200,
  triage: 1300,
  diagnose: 1500,
  coordinate: 1300,
  settings: 1000,
};

export type RoutePerfBudgetResult = {
  route: UxRebootRoute;
  durationMs: number;
  budgetMs: number;
  overBudgetByMs: number;
  withinBudget: boolean;
};

export function evaluateRoutePerfBudget(route: UxRebootRoute, durationMs: number): RoutePerfBudgetResult {
  const budgetMs = ROUTE_PERF_BUDGET_MS[route];
  const normalizedDuration = Math.max(0, Math.round(durationMs));
  const overBudgetByMs = Math.max(0, normalizedDuration - budgetMs);
  return {
    route,
    durationMs: normalizedDuration,
    budgetMs,
    overBudgetByMs,
    withinBudget: overBudgetByMs === 0,
  };
}
