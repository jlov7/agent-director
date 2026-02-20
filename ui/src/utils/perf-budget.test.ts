import { evaluateRoutePerfBudget, ROUTE_PERF_BUDGET_MS } from './perf';

test('evaluateRoutePerfBudget marks under-budget route render as passing', () => {
  const result = evaluateRoutePerfBudget('overview', ROUTE_PERF_BUDGET_MS.overview - 25);
  expect(result.withinBudget).toBe(true);
  expect(result.overBudgetByMs).toBe(0);
});

test('evaluateRoutePerfBudget reports over-budget duration with delta', () => {
  const result = evaluateRoutePerfBudget('diagnose', ROUTE_PERF_BUDGET_MS.diagnose + 120);
  expect(result.withinBudget).toBe(false);
  expect(result.overBudgetByMs).toBe(120);
});
