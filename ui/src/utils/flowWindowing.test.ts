import { filterNodesByViewport } from './flowWindowing';

const nodes = [
  { id: 'a', x: 0, y: 0, width: 200, height: 120 },
  { id: 'b', x: 800, y: 0, width: 200, height: 120 },
  { id: 'c', x: 0, y: 800, width: 200, height: 120 },
];

test('filters nodes outside viewport', () => {
  const viewport = { x: 0, y: 0, zoom: 1 };
  const container = { width: 400, height: 400 };
  const visible = filterNodesByViewport(nodes, viewport, container, 0).map((node) => node.id);
  expect(visible).toEqual(['a']);
});

test('includes nodes within padding', () => {
  const viewport = { x: 0, y: 0, zoom: 1 };
  const container = { width: 400, height: 400 };
  const visible = filterNodesByViewport(nodes, viewport, container, 600).map((node) => node.id);
  expect(visible).toEqual(['a', 'b', 'c']);
});
