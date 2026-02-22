# Determinism Snippets

## FE-089: Reusable Query Controls

```ts
const params = new URLSearchParams(window.location.search);
const seed = params.get('seed');
const staticMode = params.get('static') === '1';
const ticks = Number(params.get('ticks') ?? '0');
const debug = params.get('debug') === '1';
```

## Seeded RNG Hook

```ts
function createSeededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
```

## Ready + Debug Contract

```ts
(window as any).__READY = false;
(window as any).__constellationDebug = () => ({ ...snapshot });
(window as any).__READY = true;
```

## Screenshot Freeze Pattern

```ts
await expect(page.locator('#target')).toHaveScreenshot('target.png', {
  stylePath: FREEZE_STYLE_PATH,
});
```

## Portable Templates

- `scripts/templates/verify-visual.template.sh`
- `scripts/templates/playwright.visual.preset.ts`
