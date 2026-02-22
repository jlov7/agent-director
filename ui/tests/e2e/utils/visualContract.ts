export type VisualDebugContract = {
  dpr: number;
  canvas: {
    w: number;
    h: number;
    cssW: number;
    cssH: number;
  };
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

export type VisualAssertionResult = {
  id: string;
  status: 'pass' | 'fail';
  details: string;
};

function ok(id: string, details = 'ok'): VisualAssertionResult {
  return { id, status: 'pass', details };
}

function fail(id: string, details: string): VisualAssertionResult {
  return { id, status: 'fail', details };
}

export function evaluateVisualContract(
  debug: VisualDebugContract,
  expectedNodeCount: number
): VisualAssertionResult[] {
  const results: VisualAssertionResult[] = [];

  results.push(
    debug.overlaps.length === 0
      ? ok('geometry.overlaps', 'no overlaps')
      : fail('geometry.overlaps', `overlaps=${debug.overlaps.length}`)
  );

  results.push(
    debug.clipped.length === 0
      ? ok('geometry.clipped', 'no clipped nodes')
      : fail('geometry.clipped', `clipped=${debug.clipped.join(',')}`)
  );

  results.push(
    debug.zeroSized.length === 0
      ? ok('geometry.zero_sized', 'no zero-sized nodes')
      : fail('geometry.zero_sized', `zeroSized=${debug.zeroSized.join(',')}`)
  );

  results.push(
    debug.invalid.length === 0
      ? ok('geometry.invalid', 'no invalid nodes')
      : fail('geometry.invalid', `invalid=${debug.invalid.join(',')}`)
  );

  results.push(
    debug.nodes.length === expectedNodeCount
      ? ok('nodes.count', `count=${debug.nodes.length}`)
      : fail('nodes.count', `expected=${expectedNodeCount} received=${debug.nodes.length}`)
  );

  results.push(
    debug.expectedNodeCount === expectedNodeCount
      ? ok('nodes.expected_count', `expectedCount=${debug.expectedNodeCount}`)
      : fail(
          'nodes.expected_count',
          `expected=${expectedNodeCount} received=${debug.expectedNodeCount}`
        )
  );

  let finiteFailure = '';
  for (const node of debug.nodes) {
    if (
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !Number.isFinite(node.r) ||
      !Number.isFinite(node.w) ||
      !Number.isFinite(node.h)
    ) {
      finiteFailure = `node=${node.id}`;
      break;
    }
    if (node.r <= 0 || node.w <= 0 || node.h <= 0) {
      finiteFailure = `non-positive-size node=${node.id}`;
      break;
    }
  }
  results.push(
    finiteFailure === ''
      ? ok('nodes.finite_and_positive', 'all coordinates finite and positive')
      : fail('nodes.finite_and_positive', finiteFailure)
  );

  const expectedPixelW = Math.round(debug.canvas.cssW * debug.dpr);
  const expectedPixelH = Math.round(debug.canvas.cssH * debug.dpr);
  results.push(
    debug.canvas.w === expectedPixelW && debug.canvas.h === expectedPixelH
      ? ok('canvas.dpr_match', `w=${debug.canvas.w} h=${debug.canvas.h}`)
      : fail(
          'canvas.dpr_match',
          `expected=(${expectedPixelW},${expectedPixelH}) received=(${debug.canvas.w},${debug.canvas.h})`
        )
  );

  return results;
}

export function isVisualContractPass(results: VisualAssertionResult[]): boolean {
  return results.every((result) => result.status === 'pass');
}
