import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, MiniMap, Node, type ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';

import type { StepSummary, TraceSummary } from '../../types';
import { buildIoEdgesFromSummary } from '../../utils/ioEdgeUtils';
import { buildFlowLayout } from '../../utils/flowLayout';
import { filterNodesByViewport, type Viewport } from '../../utils/flowWindowing';
import { diffTraces } from '../../utils/diff';
import EdgeLayerToggles, { type EdgeLayerState } from './EdgeLayerToggles';
import { nodeTypes, type StepNodeData } from './nodeTypes';

const defaultLayers: EdgeLayerState = { structure: true, sequence: false, io: true };
const FLOW_NODE_WIDTH = 220;
const FLOW_NODE_HEIGHT = 120;

type VisualQueryControls = {
  seed: number | null;
  staticMode: boolean;
  ticks: number;
  debug: boolean;
  enabled: boolean;
};

type VisualDebugSnapshot = {
  dpr: number;
  canvas: { w: number; h: number; cssW: number; cssH: number };
  nodes: Array<{ id: string; x: number; y: number; r: number; w: number; h: number }>;
  overlaps: Array<{ a: string; b: string }>;
  clipped: string[];
  zeroSized: string[];
  invalid: string[];
  expectedNodeCount: number;
  seed: number | null;
  watermark: {
    sha: string;
    viewport: string;
    dpr: string;
    seed: string;
    frame: string;
  };
};

type FlowWindowWithVisualDebug = Window & {
  __READY?: boolean;
  __constellationDebug?: () => VisualDebugSnapshot;
};

function parseVisualQueryControls(): VisualQueryControls {
  if (typeof window === 'undefined') {
    return { seed: null, staticMode: false, ticks: 0, debug: false, enabled: false };
  }
  const params = new URLSearchParams(window.location.search);
  const seedRaw = params.get('seed');
  const ticksRaw = params.get('ticks');
  const seed = seedRaw && /^-?\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const ticksParsed = ticksRaw && /^\d+$/.test(ticksRaw) ? Number(ticksRaw) : 0;
  const staticMode = params.get('static') === '1';
  const debug = params.get('debug') === '1';
  const enabled = seed !== null || staticMode || debug || ticksParsed > 0;

  return {
    seed,
    staticMode,
    ticks: Number.isFinite(ticksParsed) ? Math.max(0, ticksParsed) : 0,
    debug,
    enabled,
  };
}

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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [settlementFrame, setSettlementFrame] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const viewportRef = useRef<Viewport>(viewport);
  const rafRef = useRef<number | null>(null);
  const visualQuery = useMemo(() => parseVisualQueryControls(), []);
  const gitSha = import.meta.env.VITE_GIT_SHA ?? 'dev';
  const shouldShowWatermark = visualQuery.enabled && (import.meta.env.DEV || import.meta.env.MODE === 'test');
  const viewportLabel =
    typeof window === 'undefined' ? '0x0' : `${window.innerWidth}x${window.innerHeight}`;
  const dprLabel = typeof window === 'undefined' ? '1' : `${window.devicePixelRatio || 1}`;
  const visualCanvasStyle = visualQuery.enabled ? { minHeight: '720px', height: '720px' } : undefined;

  useEffect(() => {
    if (steps.length <= 500) {
      setWindowed(false);
    }
  }, [steps.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncContainerSize = () => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    };

    syncContainerSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => syncContainerSize());
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', syncContainerSize);
    return () => window.removeEventListener('resize', syncContainerSize);
  }, []);

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
      debug: visualQuery.debug,
    } as StepNodeData,
  })) as Node<StepNodeData>[];

  const nodeRects = allNodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: FLOW_NODE_WIDTH,
    height: FLOW_NODE_HEIGHT,
  }));

  const containerDims = containerSize;

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
      animated: edge.kind === 'io' && !visualQuery.staticMode,
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
          debug: visualQuery.debug,
        } as StepNodeData,
      })) as Node<StepNodeData>[];
  }, [compareTrace, compareSteps, comparePositionById, addedIds, overlayEnabled, visualQuery.debug]);

  const buildVisualDebugSnapshot = useCallback(
    (frame: number): VisualDebugSnapshot => {
      const container = containerRef.current;
      const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
      const containerRect = container?.getBoundingClientRect();
      const cssW = containerRect?.width ?? 0;
      const cssH = containerRect?.height ?? 0;
      const nodeElements = container
        ? Array.from(container.querySelectorAll<HTMLElement>('.react-flow__node'))
        : [];

      const nodesFromDom = nodeElements.map((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left - (containerRect?.left ?? 0) + rect.width / 2;
        const y = rect.top - (containerRect?.top ?? 0) + rect.height / 2;
        return {
          id: element.getAttribute('data-id') ?? element.dataset.id ?? 'unknown',
          x,
          y,
          r: Math.max(rect.width, rect.height) / 2,
          w: rect.width,
          h: rect.height,
        };
      });

      const overlaps: Array<{ a: string; b: string }> = [];
      for (let i = 0; i < nodesFromDom.length; i += 1) {
        for (let j = i + 1; j < nodesFromDom.length; j += 1) {
          const a = nodesFromDom[i];
          const b = nodesFromDom[j];
          const aLeft = a.x - a.w / 2;
          const aRight = a.x + a.w / 2;
          const aTop = a.y - a.h / 2;
          const aBottom = a.y + a.h / 2;
          const bLeft = b.x - b.w / 2;
          const bRight = b.x + b.w / 2;
          const bTop = b.y - b.h / 2;
          const bBottom = b.y + b.h / 2;
          const intersects =
            aLeft < bRight - 1 &&
            aRight > bLeft + 1 &&
            aTop < bBottom - 1 &&
            aBottom > bTop + 1;
          if (intersects) overlaps.push({ a: a.id, b: b.id });
        }
      }

      const clipped = nodesFromDom
        .filter((node) => {
          return node.x < -1 || node.y < -1 || node.x > cssW + 1 || node.y > cssH + 1;
        })
        .map((node) => node.id);

      const zeroSized = nodesFromDom
        .filter((node) => node.w <= 0 || node.h <= 0)
        .map((node) => node.id);

      const invalid = nodesFromDom
        .filter(
          (node) =>
            !Number.isFinite(node.x) ||
            !Number.isFinite(node.y) ||
            !Number.isFinite(node.r) ||
            !Number.isFinite(node.w) ||
            !Number.isFinite(node.h)
        )
        .map((node) => node.id);

      return {
        dpr,
        canvas: {
          w: Math.round(cssW * dpr),
          h: Math.round(cssH * dpr),
          cssW,
          cssH,
        },
        nodes: nodesFromDom,
        overlaps,
        clipped,
        zeroSized,
        invalid,
        expectedNodeCount: allNodes.length,
        seed: visualQuery.seed,
        watermark: {
          sha: gitSha,
          viewport: viewportLabel,
          dpr: dprLabel,
          seed: visualQuery.seed == null ? 'none' : String(visualQuery.seed),
          frame: String(frame),
        },
      };
    },
    [allNodes.length, dprLabel, gitSha, viewportLabel, visualQuery.seed]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const visualWindow = window as FlowWindowWithVisualDebug;

    if (!visualQuery.enabled) {
      delete visualWindow.__READY;
      delete visualWindow.__constellationDebug;
      return;
    }

    visualWindow.__READY = false;
    let cancelled = false;
    const targetTicks = Math.max(0, visualQuery.ticks);
    let frame = 0;
    let fitAttempts = 0;

    const settle = () => {
      if (cancelled) return;
      if (frame < targetTicks) {
        frame += 1;
        requestAnimationFrame(settle);
        return;
      }

      const snapshot = buildVisualDebugSnapshot(frame);
      visualWindow.__constellationDebug = () => buildVisualDebugSnapshot(frame);
      if (snapshot.canvas.cssW <= 0 || snapshot.canvas.cssH <= 0 || snapshot.nodes.length === 0) {
        requestAnimationFrame(settle);
        return;
      }
      if (snapshot.clipped.length > 0 && fitAttempts < 8) {
        fitAttempts += 1;
        flowInstanceRef.current?.fitView({
          duration: 0,
          padding: 0.2,
          includeHiddenNodes: true,
          minZoom: 0.05,
          maxZoom: 2,
        });
        requestAnimationFrame(settle);
        return;
      }

      setSettlementFrame(frame);
      visualWindow.__READY = true;
    };

    requestAnimationFrame(settle);
    return () => {
      cancelled = true;
      visualWindow.__READY = false;
    };
  }, [buildVisualDebugSnapshot, visualQuery.enabled, visualQuery.ticks]);

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
        id="constellation"
        ref={containerRef}
        style={visualCanvasStyle}
        data-visual-debug={visualQuery.debug ? '1' : '0'}
        data-visual-static={visualQuery.staticMode ? '1' : '0'}
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
          onInit={(instance) => {
            flowInstanceRef.current = instance;
          }}
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
          minZoom={0.05}
          maxZoom={2}
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.05,
            maxZoom: 2,
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
            maskColor="var(--flow-minimap-mask)"
          />
          <Background gap={20} />
          <Controls position="bottom-right" />
        </ReactFlow>
        {shouldShowWatermark ? (
          <div id="visual-watermark" className="visual-watermark">
            {`sha=${gitSha} viewport=${viewportLabel} dpr=${dprLabel} seed=${visualQuery.seed ?? 'none'} frame=${settlementFrame}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
