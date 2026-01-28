import dagre from 'dagre';
import type { StepSummary } from '../types';

export type FlowNode = {
  id: string;
  position: { x: number; y: number };
};

const layoutCache = new Map<string, { signature: string; layout: FlowNode[] }>();

function buildSignature(steps: StepSummary[], edges: Array<{ source: string; target: string }>) {
  const stepPart = steps.map((step) => step.id).join('|');
  const edgePart = edges.map((edge) => `${edge.source}->${edge.target}`).join('|');
  return `${steps.length}:${edges.length}:${stepPart}:${edgePart}`;
}

export function buildFlowLayout(
  steps: StepSummary[],
  edges: Array<{ source: string; target: string }>,
  cacheKey?: string
) {
  if (cacheKey) {
    const signature = buildSignature(steps, edges);
    const cached = layoutCache.get(cacheKey);
    if (cached && cached.signature === signature) {
      return cached.layout;
    }
    const layout = computeLayout(steps, edges);
    layoutCache.set(cacheKey, { signature, layout });
    return layout;
  }
  return computeLayout(steps, edges);
}

function computeLayout(steps: StepSummary[], edges: Array<{ source: string; target: string }>) {
  if (steps.length > 2500) {
    const columnCount = Math.ceil(Math.sqrt(steps.length));
    return steps.map((step, index) => {
      const row = Math.floor(index / columnCount);
      const col = index % columnCount;
      return {
        id: step.id,
        position: { x: col * 260, y: row * 160 },
      };
    });
  }

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 80 });
  graph.setDefaultEdgeLabel(() => ({}));

  steps.forEach((step) => {
    graph.setNode(step.id, { width: 220, height: 120 });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return steps.map((step) => {
    const node = graph.node(step.id);
    return {
      id: step.id,
      position: { x: node.x - node.width / 2, y: node.y - node.height / 2 },
    };
  });
}
