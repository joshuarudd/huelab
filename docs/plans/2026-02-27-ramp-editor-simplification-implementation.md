# Ramp Editor Simplification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify ramp editing so RampParams is just `{ baseColor }`, with chroma curve and auto hue shift as system-wide settings, and a base color fit suggestion in the UI.

**Architecture:** Move `chromaCurve` and `hueShift` out of `RampParams` into new `SystemSettings` on `ProjectState`. Change `generateRamp()` signature to accept these as separate arguments. Add `computeBaseStopHex()` helper for the UI suggestion. Update all callers and tests.

**Tech Stack:** TypeScript, React, Vitest, Tailwind CSS v4

---

### Task 1: Simplify `RampParams` and add `SystemSettings` types

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/webapp/src/types.ts`

**Step 1: Update `RampParams` in core types**

In `packages/core/src/types.ts`, replace the `RampParams` interface:

```ts
/** Parameters that control ramp generation */
export interface RampParams {
  baseColor: string; // Input color (hex, oklch, etc.)
}
```

Also add `ChromaCurve` type alias (exported, used by SystemSettings and generateRamp):

```ts
/** Chroma curve options for ramp generation */
export type ChromaCurve = 'natural' | 'linear' | 'flat';
```

**Step 2: Add `SystemSettings` to webapp types**

In `packages/webapp/src/types.ts`, add `SystemSettings` interface and add it to `ProjectState`:

```ts
/** System-wide color settings (apply to all ramps) */
export interface SystemSettings {
  chromaCurve: ChromaCurve;
  autoHueShift: boolean;
}
```

Import `ChromaCurve` from `@huelab/core`. Add `systemSettings: SystemSettings` to the `ProjectState` interface.

Add new actions to `ProjectAction`:

```ts
| { type: 'SET_CHROMA_CURVE'; curve: ChromaCurve }
| { type: 'SET_AUTO_HUE_SHIFT'; enabled: boolean }
```

**Step 3: Verify typecheck fails**

Run: `npm run typecheck`
Expected: FAIL — many callers still pass old `RampParams` shape with `chromaCurve`/`hueShift`.

**Step 4: Commit**

```
feat(core): simplify RampParams to baseColor only, add ChromaCurve type

Moves chromaCurve and hueShift out of per-ramp params into
system-wide settings. Part of ramp editor simplification (#2).
```

---

### Task 2: Update `generateRamp()` signature and logic

**Files:**
- Modify: `packages/core/src/ramp.ts`

**Step 1: Write failing test for new signature**

In `packages/core/src/__tests__/ramp.test.ts`, add a new test:

```ts
it('accepts chromaCurve and autoHueShift as separate args', () => {
  const ramp = generateRamp('test', { baseColor: '#3366cc' }, STOPS, 'natural', false);
  expect(ramp.stops).toHaveLength(11);
});
```

Run: `npm test --workspace=@huelab/core -- -t "accepts chromaCurve"`
Expected: FAIL — generateRamp doesn't accept 5 args yet.

**Step 2: Update `generateRamp()` signature**

Change `generateRamp` to accept system-wide settings as separate parameters with defaults:

```ts
export function generateRamp(
  name: string,
  params: RampParams,
  stops: StopDefinition[],
  chromaCurve: ChromaCurve = 'natural',
  autoHueShift: boolean = false,
): Ramp {
```

Import `ChromaCurve` from `./types.js`.

Update the internal `getChromaScales` call to use the `chromaCurve` parameter instead of `params.chromaCurve`.

**Step 3: Update hue shift logic**

Replace the current hue shift calculation:

```ts
// Before:
const hueOffset = lastIndex > 0
  ? -params.hueShift / 2 + (params.hueShift * index) / lastIndex
  : 0;

// After:
const AUTO_HUE_SHIFT_DEGREES = 10;
const hueShiftAmount = autoHueShift ? AUTO_HUE_SHIFT_DEGREES : 0;
const hueOffset = lastIndex > 0
  ? -hueShiftAmount / 2 + (hueShiftAmount * index) / lastIndex
  : 0;
```

**Step 4: Export the `AUTO_HUE_SHIFT_DEGREES` constant**

Export it so tests can reference it:

```ts
export const AUTO_HUE_SHIFT_DEGREES = 10;
```

**Step 5: Update the `getChromaScales` function parameter type**

Change from `RampParams['chromaCurve']` to `ChromaCurve`:

```ts
function getChromaScales(curve: ChromaCurve): readonly number[] {
```

**Step 6: Remove `chromaCurve` from Ramp's stored params**

The `Ramp` interface stores `params: RampParams`, which now only has `baseColor`. The returned ramp object already gets its `params` from the input, so this works automatically.

**Step 7: Run tests**

Run: `npm test --workspace=@huelab/core -- -t "accepts chromaCurve"`
Expected: PASS

**Step 8: Commit**

```
feat(core): update generateRamp to accept system-wide settings as args

chromaCurve and autoHueShift are now separate parameters with
defaults, not part of RampParams. Part of (#2).
```

---

### Task 3: Add `computeBaseStopHex()` helper

**Files:**
- Modify: `packages/core/src/ramp.ts`
- Test: `packages/core/src/__tests__/ramp.test.ts`

**Step 1: Write failing test**

```ts
describe('computeBaseStopHex', () => {
  it('returns the hex of the base stop in the generated ramp', () => {
    const hex = computeBaseStopHex('#3366cc', STOPS, 'natural');
    // #3366cc has L ~0.54, maps to stop 500 (L=0.62), so the hex will differ
    expect(hex).not.toBe('#3366cc');
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns null for an invalid color', () => {
    const hex = computeBaseStopHex('not-a-color', STOPS, 'natural');
    expect(hex).toBeNull();
  });

  it('returns the input hex when it already matches the stop lightness', () => {
    // oklch(62% 0.14 262) has L=0.62, exactly matching stop 500
    const hex = computeBaseStopHex('oklch(62% 0.14 262)', STOPS, 'natural');
    // The input already matches the stop lightness, so base color ≈ computed
    // (may differ slightly due to gamut clamping, but should be very close)
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
```

Run: `npm test --workspace=@huelab/core -- -t "computeBaseStopHex"`
Expected: FAIL — function doesn't exist.

**Step 2: Implement `computeBaseStopHex`**

In `packages/core/src/ramp.ts`:

```ts
/**
 * Compute the hex value that the base color produces at its anchor stop.
 * Returns null if the base color is invalid.
 *
 * Use this to show a "suggested" base color that matches the ramp output.
 */
export function computeBaseStopHex(
  baseColor: string,
  stops: StopDefinition[],
  chromaCurve: ChromaCurve,
): string | null {
  const baseOklch = parseColor(baseColor);
  if (!baseOklch) return null;

  const baseStopId = findClosestStopId(baseOklch.l, stops);
  const stopDef = stops.find(s => s.id === baseStopId);
  if (!stopDef) return null;

  const baseChroma = baseOklch.c;
  const isAchromatic = baseChroma < 0.001;
  const baseHue = isAchromatic ? 0 : baseOklch.h;

  // Find the chroma scale for the base stop index
  const chromaScales = getChromaScales(chromaCurve);
  const stopIndex = stops.findIndex(s => s.id === baseStopId);
  const chroma = baseChroma * chromaScales[stopIndex];

  const color = oklchToColor(stopDef.lightness, chroma, baseHue);
  return color.hex;
}
```

**Step 3: Export from index**

Add `computeBaseStopHex` to the core package's exports (in `packages/core/src/index.ts` or wherever the barrel export is).

**Step 4: Run tests**

Run: `npm test --workspace=@huelab/core -- -t "computeBaseStopHex"`
Expected: PASS

**Step 5: Commit**

```
feat(core): add computeBaseStopHex for base color fit suggestion

Returns the hex value the base color produces at its anchor stop,
enabling the UI to suggest a matching color. Part of (#2).
```

---

### Task 4: Update all existing ramp tests

**Files:**
- Modify: `packages/core/src/__tests__/ramp.test.ts`
- Modify: `packages/core/src/__tests__/overrides.test.ts`
- Modify: `packages/core/src/__tests__/export-css.test.ts`
- Modify: `packages/core/src/__tests__/export-figma.test.ts`
- Modify: `packages/core/src/__tests__/export-json.test.ts`
- Modify: `packages/core/src/__tests__/resolver.test.ts`
- Modify: `packages/core/src/__tests__/audit.test.ts`

**Step 1: Update all `generateRamp` calls in test files**

Every test that calls `generateRamp` currently passes `{ baseColor, chromaCurve, hueShift }`. Change all to pass just `{ baseColor }` and add `chromaCurve` as a 4th argument where needed.

Pattern — find and replace across all test files:

```ts
// Before:
generateRamp('name', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS)

// After:
generateRamp('name', { baseColor: '#3366cc' }, STOPS, 'natural')
```

For calls with non-default chromaCurve (like `'flat'` or `'linear'`):

```ts
// Before:
generateRamp('test', { baseColor: '#666666', chromaCurve: 'flat', hueShift: 0 }, STOPS)

// After:
generateRamp('test', { baseColor: '#666666' }, STOPS, 'flat')
```

**Step 2: Update hue shift test**

The existing "applies hue shift across lightness range" test should test the auto hue shift feature:

```ts
it('applies auto hue shift across lightness range', () => {
  const ramp = generateRamp('test', { baseColor: 'oklch(50% 0.15 200)' }, STOPS, 'natural', true);
  const lightest = ramp.stops[0].color.oklch.h;
  const darkest = ramp.stops[10].color.oklch.h;
  expect(Math.abs(darkest - lightest)).toBeGreaterThan(5);
});

it('does not shift hue when autoHueShift is off', () => {
  const ramp = generateRamp('test', { baseColor: 'oklch(50% 0.15 200)' }, STOPS, 'natural', false);
  const lightest = ramp.stops[0].color.oklch.h;
  const darkest = ramp.stops[10].color.oklch.h;
  expect(Math.abs(darkest - lightest)).toBeLessThan(1);
});
```

**Step 3: Update the export-json round-trip test**

The test at `export-json.test.ts:30-37` checks `parsed.params.chromaCurve` and `parsed.params.hueShift`. Update it to only check `baseColor`:

```ts
it('round-trips the ramp data faithfully', () => {
  const ramp = generateRamp('green', { baseColor: '#33cc66' }, STOPS, 'linear');
  const json = exportRampJSON(ramp);
  const parsed = JSON.parse(json);
  expect(parsed.params.baseColor).toBe('#33cc66');
});
```

**Step 4: Run full test suite**

Run: `npm test --workspace=@huelab/core`
Expected: ALL PASS

**Step 5: Commit**

```
test(core): update all tests for simplified generateRamp signature

All tests now pass chromaCurve as a separate arg and use the new
autoHueShift boolean. Part of (#2).
```

---

### Task 5: Update `import-figma.ts` and `ImportModal.tsx`

**Files:**
- Modify: `packages/core/src/import-figma.ts:201-207`
- Modify: `packages/webapp/src/components/ImportModal.tsx:174-178`

**Step 1: Update import-figma**

In `packages/core/src/import-figma.ts`, the Ramp object construction hardcodes `chromaCurve` and `hueShift` in `params`. Remove them:

```ts
// Before:
params: {
  baseColor: baseHex,
  chromaCurve: 'natural',
  hueShift: 0,
},

// After:
params: {
  baseColor: baseHex,
},
```

**Step 2: Update ImportModal**

In `packages/webapp/src/components/ImportModal.tsx`, find where RampParams is constructed during CSS import and remove `chromaCurve`/`hueShift`:

```ts
// Before:
params: { baseColor: middleHex, chromaCurve: 'natural', hueShift: 0 }

// After:
params: { baseColor: middleHex }
```

**Step 3: Run typecheck and tests**

Run: `npm run typecheck && npm test --workspace=@huelab/core`
Expected: PASS

**Step 4: Commit**

```
fix(core): update import modules for simplified RampParams

Remove chromaCurve and hueShift from constructed RampParams in
import-figma and ImportModal. Part of (#2).
```

---

### Task 6: Update the webapp store and reducer

**Files:**
- Modify: `packages/webapp/src/store.tsx`
- Modify: `packages/webapp/src/types.ts` (if not done in Task 1)

**Step 1: Add `systemSettings` to initial state**

In `packages/webapp/src/store.tsx`:

```ts
const initialState: ProjectState = {
  ramps: [],
  selectedRampIndex: 0,
  tokenMapping: [...shadcnPreset.tokenSchema.defaultMapping],
  preset: shadcnPreset,
  mode: 'light',
  systemSettings: {
    chromaCurve: 'natural',
    autoHueShift: true,
  },
};
```

**Step 2: Add reducer cases for new actions**

```ts
case 'SET_CHROMA_CURVE':
  return {
    ...state,
    systemSettings: { ...state.systemSettings, chromaCurve: action.curve },
  };

case 'SET_AUTO_HUE_SHIFT':
  return {
    ...state,
    systemSettings: { ...state.systemSettings, autoHueShift: action.enabled },
  };
```

**Step 3: Update all `generateRamp` calls in the reducer**

Every `generateRamp` call in the reducer needs to pass the system settings. Find all calls and update them:

`ADD_RAMP` case:
```ts
const newRamp = generateRamp(
  action.name,
  action.params,
  stops,
  state.systemSettings.chromaCurve,
  state.systemSettings.autoHueShift,
);
```

`UPDATE_RAMP_PARAMS` case:
```ts
const updatedRamp = generateRamp(
  existingRamp.name,
  action.params,
  stops,
  state.systemSettings.chromaCurve,
  state.systemSettings.autoHueShift,
);
```

**Step 4: Regenerate all ramps when system settings change**

Add a helper and reducer cases that regenerate all ramps when chroma curve or auto hue shift changes:

```ts
case 'SET_CHROMA_CURVE': {
  const newSettings = { ...state.systemSettings, chromaCurve: action.curve };
  return {
    ...state,
    systemSettings: newSettings,
    ramps: regenerateAllRamps(state.ramps, getStops(state.preset), newSettings),
  };
}

case 'SET_AUTO_HUE_SHIFT': {
  const newSettings = { ...state.systemSettings, autoHueShift: action.enabled };
  return {
    ...state,
    systemSettings: newSettings,
    ramps: regenerateAllRamps(state.ramps, getStops(state.preset), newSettings),
  };
}
```

The `regenerateAllRamps` helper:

```ts
function regenerateAllRamps(
  ramps: Ramp[],
  stops: StopDefinition[],
  settings: SystemSettings,
): Ramp[] {
  return ramps.map(ramp => {
    const regenerated = generateRamp(
      ramp.name,
      ramp.params,
      stops,
      settings.chromaCurve,
      settings.autoHueShift,
    );
    // Re-apply existing overrides
    let result = regenerated;
    for (const stop of ramp.stops) {
      if (stop.overridden && stop.overrides) {
        result = applyOverride(result, stop.id, stop.overrides, stops);
      }
    }
    return result;
  });
}
```

Import `SystemSettings` from `./types.js` and `StopDefinition` from `@huelab/core`.

**Step 5: Update `CLEAR_OVERRIDE` and `OVERRIDE_STOP` generateRamp calls**

These don't call `generateRamp` directly (they call `applyOverride`/`clearOverride`), so no changes needed there.

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (or only webapp component errors remaining)

**Step 7: Commit**

```
feat(webapp): add systemSettings to store with chroma curve and auto hue shift

System-wide settings now control ramp generation for all ramps.
Changing settings regenerates all ramps. Part of (#2).
```

---

### Task 7: Update `RampOverview` (add ramp button)

**Files:**
- Modify: `packages/webapp/src/components/RampOverview.tsx`

**Step 1: Simplify `ADD_RAMP` dispatch**

The `handleAddRamp` callback currently passes `chromaCurve` and `hueShift` in params. Remove them:

```ts
// Before:
params: { baseColor, chromaCurve: 'natural', hueShift: 0 },

// After:
params: { baseColor },
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Closer to PASS

**Step 3: Commit**

```
fix(webapp): simplify ADD_RAMP params in RampOverview
```

---

### Task 8: Remove `ParamSliders`, update `RampEditor` with base color suggestion

**Files:**
- Delete: `packages/webapp/src/components/ParamSliders.tsx`
- Modify: `packages/webapp/src/components/RampEditor.tsx`

**Step 1: Remove ParamSliders import and usage from RampEditor**

In `RampEditor.tsx`:
- Remove the `import { ParamSliders }` line
- Remove the `handleParamsChange` callback (no longer needed)
- Remove the `<ParamSliders ... />` JSX
- Remove `type RampParams` from the `@huelab/core` import

**Step 2: Add base color fit suggestion**

Import `computeBaseStopHex, getStops` from `@huelab/core`. Add a `useMemo` for the suggested hex:

```tsx
const suggestedBaseHex = useMemo(() => {
  if (!ramp) return null;
  const stops = getStops(state.preset);
  const computed = computeBaseStopHex(
    ramp.params.baseColor,
    stops,
    state.systemSettings.chromaCurve,
  );
  if (!computed || computed === ramp.params.baseColor) return null;
  return computed;
}, [ramp, state.preset, state.systemSettings.chromaCurve]);
```

Add a handler to accept the suggestion:

```tsx
const handleAcceptBaseColor = useCallback(() => {
  if (!suggestedBaseHex || !ramp) return;
  dispatch({
    type: 'UPDATE_RAMP_PARAMS',
    index: state.selectedRampIndex,
    params: { baseColor: suggestedBaseHex },
  });
}, [suggestedBaseHex, ramp, state.selectedRampIndex, dispatch]);
```

Add JSX below the ColorPicker:

```tsx
{suggestedBaseHex && (
  <p className="text-xs text-neutral-400">
    Maps to stop {ramp.baseStopId} as{' '}
    <span className="font-mono text-neutral-300">{suggestedBaseHex}</span>
    {' \u2014 '}
    <button
      type="button"
      onClick={handleAcceptBaseColor}
      className="text-blue-400 hover:text-blue-300 transition-colors"
    >
      Use {suggestedBaseHex}
    </button>
  </p>
)}
```

**Step 3: Delete ParamSliders.tsx**

Remove the file entirely: `packages/webapp/src/components/ParamSliders.tsx`

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (or close — toolbar not done yet)

**Step 5: Commit**

```
feat(webapp): remove ParamSliders, add base color fit suggestion

The RampEditor now shows only the color picker, name, suggestion,
and stop strip. System-wide controls will be in the toolbar. (#2)
```

---

### Task 9: Add system-wide controls to the toolbar

**Files:**
- Modify: `packages/webapp/src/App.tsx`

**Step 1: Add imports**

Import `useProject` from the store and `ChromaCurve` from `@huelab/core`.

**Step 2: Add system settings controls to the toolbar**

In the `<header>` toolbar, add a chroma curve dropdown and auto hue shift toggle between the existing buttons:

```tsx
const { state, dispatch } = useProject();

// In the toolbar div:
<select
  value={state.systemSettings.chromaCurve}
  onChange={(e) => dispatch({ type: 'SET_CHROMA_CURVE', curve: e.target.value as ChromaCurve })}
  className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
  aria-label="Chroma curve"
>
  <option value="natural">Natural (bell)</option>
  <option value="linear">Linear</option>
  <option value="flat">Flat (uniform)</option>
</select>

<button
  type="button"
  onClick={() => dispatch({ type: 'SET_AUTO_HUE_SHIFT', enabled: !state.systemSettings.autoHueShift })}
  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
    state.systemSettings.autoHueShift
      ? 'border-blue-600 bg-blue-900/50 text-blue-300'
      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
  }`}
  aria-label="Auto hue shift"
  aria-pressed={state.systemSettings.autoHueShift}
>
  Hue Shift {state.systemSettings.autoHueShift ? 'On' : 'Off'}
</button>
```

**Step 3: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS

**Step 4: Commit**

```
feat(webapp): add chroma curve and auto hue shift to toolbar

System-wide controls in the top toolbar affect all ramps. (#2)
```

---

### Task 10: Update core barrel export and README

**Files:**
- Modify: `packages/core/src/index.ts` (or wherever exports are)
- Modify: `packages/core/README.md`

**Step 1: Export new symbols**

Ensure `computeBaseStopHex`, `AUTO_HUE_SHIFT_DEGREES`, and `ChromaCurve` are exported from the core package.

**Step 2: Update README**

Update the `ramp.ts` row in README to reflect the new signature and new export.

**Step 3: Run full build and tests**

Run: `npm run build && npm test --workspace=@huelab/core`
Expected: ALL PASS

**Step 4: Commit**

```
docs(core): update exports and README for ramp simplification (#2)
```

---

### Task 11: Final verification

**Step 1: Run full test suite**

Run: `npm test --workspace=@huelab/core`
Expected: ALL PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: All 3 packages build successfully

**Step 4: Manual smoke test**

Run: `npm run dev`

Verify:
- Add a ramp → appears with default blue base color
- Change base color → ramp updates, suggestion appears if hex differs from stop
- Accept base color suggestion → base color updates to match stop
- Change chroma curve in toolbar → all ramps regenerate
- Toggle auto hue shift → all ramps regenerate, stops show hue variation (on) or uniform hue (off)
- Per-stop overrides still work
- Import CSS → ramps load correctly
- Export CSS → valid output

**Step 5: Commit any fixes from smoke testing**
