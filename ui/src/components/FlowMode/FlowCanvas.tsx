import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, MiniMap, Node } from 'reactflow';
import 'reactflow/dist/style.css';

import type { StepSummary, TraceSummary } from '../../types';
import { buildIoEdgesFromSummary } from '../../utils/ioEdgeUtils';
import { buildFlowLayout } from '../../utils/flowLayout';
import { filterNodesByViewport, type Viewport } from '../../utils/flowWindowing';
import { diffTraces } from '../../utils/diff';
import EdgeLayerToggles, { type EdgeLayerState } from './EdgeLayerToggles';
import { nodeTypes, type StepNodeData } from './nodeTypes';

const defaultLayers: EdgeLayerState = { structure: true, sequence: false, io: true };

function buildStructureEdges(steps: StepSummary[]) {
  return steps
    .filter((step) => step.parentStepId)
    .map((step) => ({
      id: `structure_${step.parentStepId}_${step.id}`,
      source: step.parentStepId as string,
      target: step.id,
      kind: 'structure' as const,
    }));
}

function buildSequenceEdges(steps: StepSummary[]) {
  const sorted = [...steps].sort((a, b) => a.index - b.index);
  const edges = [] as Array<{ id: string; source: string; target: string; kind: 'sequence' }>;
  for (let i = 1; i < sorted.length; i += 1) {
    edges.push({
      id: `sequence_${sorted[i - 1].id}_${sorted[i].id}`,
      source: sorted[i - 1].id,
      target: sorted[i].id,
      kind: 'sequence',
    });
  }
  return edges;
}

type FlowCanvasProps = {
  steps: StepSummary[];
  onSelectStep: (stepId: string) => void;
  selectedStepId?: string | null;
  baseTrace: TraceSummary;
  compareTrace?: TraceSummary | null;
  compareSteps?: StepSummary[];
  overlayEnabled: boolean;
  onToggleOverlay: () => void;
};

export default function FlowCanvas({
  steps,
  onSelectStep,
  selectedStepId,
  baseTrace,
  compareTrace,
  compareSteps = [],
  overlayEnabled,
  onToggleOverlay,
}: FlowCanvasProps) {
  const [layers, setLayers] = useState(defaultLayers);
  const [windowed, setWindowed] = useState(steps.length > 500);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport>(viewport);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (steps.length <= 500) {
      setWindowed(false);
    }
  }, [steps.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const edges = useMemo(() => {
    const structureEdges = buildStructureEdges(steps);
    const sequenceEdges = buildSequenceEdges(steps);
    const ioEdges = buildIoEdgesFromSummary(steps);

    const selected: Array<{ id: string; source: string; target: string; kind: string; toolCallId?: string }> = [];
    if (layers.structure) selected.push(...structureEdges);
    if (layers.sequence) selected.push(...sequenceEdges);
    if (layers.io) selected.push(...ioEdges);
    return selected;
  }, [steps, layers]);

  const layoutEdges = useMemo(() => {
    const structureEdges = buildStructureEdges(steps);
    const sequenceEdges = buildSequenceEdges(steps);
    const ioEdges = buildIoEdgesFromSummary(steps);
    return [...structureEdges, ...sequenceEdges, ...ioEdges];
  }, [steps]);

  const layout = useMemo(() => {
    return buildFlowLayout(
      steps,
      layoutEdges.map((edge) => ({ source: edge.source, target: edge.target })),
      baseTrace.id
    );
  }, [steps, layoutEdges, baseTrace.id]);

  const diff = useMemo(() => {
    if (!compareTrace) return null;
    return diffTraces(baseTrace, compareTrace);
  }, [baseTrace, compareTrace]);

  const addedIds = useMemo(() => new Set(diff?.addedSteps ?? []), [diff]);
  const changedIds = useMemo(() => new Set(diff?.changedSteps ?? []), [diff]);
  const removedIds = useMemo(() => new Set(diff?.removedSteps ?? []), [diff]);

  const positionById = new Map(layout.map((node) => [node.id, node.position]));

  const allNodes = steps.map((step) => ({
    id: step.id,
    type: 'stepNode',
    position: positionById.get(step.id) ?? { x: 0, y: 0 },
    data: {
      step,
      diffStatus: changedIds.has(step.id) ? 'changed' : removedIds.has(step.id) ? 'removed' : null,
      ghost: false,
    } as StepNodeData,
  })) as Node<StepNodeData>[];

  const nodeRects = allNodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: 220,
    height: 120,
  }));

  const containerDims = {
    width: containerRef.current?.clientWidth ?? 0,
    height: containerRef.current?.clientHeight ?? 0,
  };

  const nodeById = new Map(allNodes.map((node) => [node.id, node]));

  let visibleNodes = windowed
    ? filterNodesByViewport(nodeRects, viewport, containerDims, 300).map((rect) => nodeById.get(rect.id))
    : [...allNodes];

  const visibleNodeIds = new Set(
    (visibleNodes.filter(Boolean) as Node<StepNodeData>[]).map((node) => node.id)
  );

  if (selectedStepId && !visibleNodeIds.has(selectedStepId)) {
    const selectedNode = nodeById.get(selectedStepId);
    if (selectedNode) {
      visibleNodeIds.add(selectedNode.id);
      visibleNodes = [...visibleNodes, selectedNode];
    }
  }

  const flowEdges = edges
    .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    .map((edge): Edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edge.kind === 'io',
      style:
        edge.kind === 'io'
          ? { stroke: 'var(--accent-io)', strokeWidth: 2 }
          : edge.kind === 'sequence'
            ? { stroke: 'var(--accent-sequence)', strokeDasharray: '6 6' }
            : { stroke: 'var(--accent-structure)' },
    }));

  const nodes = (visibleNodes.filter(Boolean) as Node<StepNodeData>[]).map((node) => ({
    ...node,
  }));

  const compareEdges = useMemo(() => {
    if (!compareTrace) return [];
    const structureEdges = buildStructureEdges(compareTrace.steps);
    const sequenceEdges = buildSequenceEdges(compareTrace.steps);
    const ioEdges = buildIoEdgesFromSummary(compareTrace.steps);
    return [...structureEdges, ...sequenceEdges, ...ioEdges];
  }, [compareTrace]);

  const compareLayout = useMemo(() => {
    if (!compareTrace) return [];
    return buildFlowLayout(
      compareTrace.steps,
      compareEdges.map((edge) => ({ source: edge.source, target: edge.target })),
      compareTrace.id
    );
  }, [compareTrace, compareEdges]);

  const comparePositionById = useMemo(
    () => new Map(compareLayout.map((node) => [node.id, node.position])),
    [compareLayout]
  );

  const ghostNodes = useMemo(() => {
    if (!compareTrace || !overlayEnabled) return [];
    return compareSteps
      .filter((step) => addedIds.has(step.id))
      .map((step) => ({
        id: `ghost-${step.id}`,
        type: 'stepNode',
        position: comparePositionById.get(step.id) ?? { x: 0, y: 0 },
        data: {
          step,
          diffStatus: 'added',
          ghost: true,
        } as StepNodeData,
      })) as Node<StepNodeData>[];
  }, [compareTrace, compareSteps, comparePositionById, addedIds, overlayEnabled]);

  return (
    <div className="flow-mode">
      <div
        className="flow-controls"
        data-help
        data-help-title="Flow controls"
        data-help-body="Toggle edge layers and windowing for high-density graphs."
        data-help-placement="bottom"
      >
        <EdgeLayerToggles layers={layers} onChange={setLayers} />
        {steps.length > 500 ? (
          <label
            className="toggle"
            title="Window nodes based on viewport for large graphs"
            data-help
            data-help-title="Windowed flow"
            data-help-body="Limits the graph to the visible region for performance."
            data-help-placement="bottom"
          >
            <input type="checkbox" checked={windowed} onChange={() => setWindowed((prev) => !prev)} />
            Windowed
          </label>
        ) : null}
        {compareTrace ? (
          <button
            className="ghost-button"
            type="button"
            onClick={onToggleOverlay}
            title="Show or hide ghost overlay from replay"
            data-help
            data-help-title="Overlay diff"
            data-help-body="Layer the replay on top to see what changed."
            data-help-placement="bottom"
          >
            {overlayEnabled ? 'Hide overlay' : 'Show overlay'} ({diff?.addedSteps.length ?? 0}/
            {diff?.removedSteps.length ?? 0}/
            {diff?.changedSteps.length ?? 0})
          </button>
        ) : null}
      </div>
      <div
        className="flow-canvas"
        ref={containerRef}
        data-help
        data-help-indicator
        data-help-title="Flow canvas"
        data-help-body="A spatial map of step dependencies. Click nodes to inspect."
        data-help-placement="top"
      >
        <ReactFlow
          nodes={overlayEnabled ? [...nodes, ...ghostNodes] : nodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            const id = node.id.startsWith('ghost-') ? node.id.replace('ghost-', '') : node.id;
            onSelectStep(id);
          }}
          onMove={(_, nextViewport) => {
            viewportRef.current = nextViewport;
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => {
              setViewport(viewportRef.current);
              rafRef.current = null;
            });
          }}
          fitView
        >
          <MiniMap
            nodeColor={(node) => {
              const type = (node.data as StepNodeData).step.type;
              switch (type) {
                case 'llm_call':
                  return 'var(--accent-llm)';
                case 'tool_call':
                  return 'var(--accent-tool)';
                case 'decision':
                  return 'var(--accent-decision)';
                case 'handoff':
                  return 'var(--accent-handoff)';
                case 'guardrail':
                  return 'var(--accent-guardrail)';
                default:
                  return 'var(--accent-structure)';
              }
            }}
            maskColor="rgba(15, 17, 21, 0.6)"
          />
          <Background gap={20} />
          <Controls position="bottom-right" />
        </ReactFlow>
      </div>
    </div>
  );
}
