export type Viewport = { x: number; y: number; zoom: number };
export type FlowNodeRect = { id: string; x: number; y: number; width: number; height: number };
export type ContainerRect = { width: number; height: number };

export function flowViewportRect(viewport: Viewport, container: ContainerRect, padding = 200) {
  const zoom = viewport.zoom || 1;
  const minX = (0 - viewport.x) / zoom - padding;
  const minY = (0 - viewport.y) / zoom - padding;
  const maxX = (container.width - viewport.x) / zoom + padding;
  const maxY = (container.height - viewport.y) / zoom + padding;
  return { minX, minY, maxX, maxY };
}

export function filterNodesByViewport(
  nodes: FlowNodeRect[],
  viewport: Viewport,
  container: ContainerRect,
  padding = 200
) {
  if (container.width <= 0 || container.height <= 0) return nodes;
  const rect = flowViewportRect(viewport, container, padding);
  return nodes.filter((node) => {
    const nodeMinX = node.x;
    const nodeMinY = node.y;
    const nodeMaxX = node.x + node.width;
    const nodeMaxY = node.y + node.height;
    return !(nodeMaxX < rect.minX || nodeMinX > rect.maxX || nodeMaxY < rect.minY || nodeMinY > rect.maxY);
  });
}
