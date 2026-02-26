# UX Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the color picker (add native OS picker), make ramp names meaningful and editable, and fix two Token Map bugs (selection persistence + layout shift).

**Architecture:** Four independent changes to the webapp layer, plus one new utility in `@huelab/core`. All webapp changes are in existing components — no new files except the test file for `hueToName`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest

**Design doc:** `docs/plans/2026-02-26-ux-polish-design.md`

---

### Task 1: Add `hueToName()` utility to core

**Files:**
- Modify: `packages/core/src/oklch.ts` (add function at end)
- Modify: `packages/core/src/index.ts` (already re-exports all from oklch.ts — no change needed)
- Test: `packages/core/src/__tests__/oklch.test.ts`

**Step 1: Write the failing test**

Add to `packages/core/src/__tests__/oklch.test.ts`:

```ts
import { hueToName } from '../oklch.js';

describe('hueToName', () => {
  it('returns "neutral" for achromatic colors', () => {
    expect(hueToName(180, 0.005)).toBe('neutral');
    expect(hueToName(0, 0)).toBe('neutral');
  });

  it('maps hue angles to expected color names', () => {
    expect(hueToName(30, 0.1)).toBe('red');
    expect(hueToName(55, 0.1)).toBe('orange');
    expect(hueToName(80, 0.1)).toBe('amber');
    expect(hueToName(100, 0.1)).toBe('yellow');
    expect(hueToName(130, 0.1)).toBe('lime');
    expect(hueToName(160, 0.1)).toBe('green');
    expect(hueToName(190, 0.1)).toBe('emerald');
    expect(hueToName(215, 0.1)).toBe('cyan');
    expect(hueToName(245, 0.1)).toBe('sky');
    expect(hueToName(270, 0.1)).toBe('blue');
    expect(hueToName(295, 0.1)).toBe('indigo');
    expect(hueToName(320, 0.1)).toBe('purple');
    expect(hueToName(350, 0.1)).toBe('pink');
    expect(hueToName(10, 0.1)).toBe('pink');
  });

  it('normalizes hue to 0-360 range', () => {
    expect(hueToName(370, 0.1)).toBe('pink');
    expect(hueToName(-10, 0.1)).toBe('pink');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test --workspace=@huelab/core -- --run -t "hueToName"`
Expected: FAIL — `hueToName` is not exported

**Step 3: Write minimal implementation**

Add to end of `packages/core/src/oklch.ts`:

```ts
// ---------------------------------------------------------------------------
// Hue-to-name mapping
// ---------------------------------------------------------------------------

/** OKLCH hue ranges mapped to human-readable color names */
const HUE_NAMES: Array<{ max: number; name: string }> = [
  { max: 20, name: 'pink' },
  { max: 45, name: 'red' },
  { max: 65, name: 'orange' },
  { max: 90, name: 'amber' },
  { max: 115, name: 'yellow' },
  { max: 145, name: 'lime' },
  { max: 175, name: 'green' },
  { max: 200, name: 'emerald' },
  { max: 230, name: 'cyan' },
  { max: 260, name: 'sky' },
  { max: 285, name: 'blue' },
  { max: 310, name: 'indigo' },
  { max: 335, name: 'purple' },
  { max: 360, name: 'pink' },
];

/**
 * Map an OKLCH hue angle + chroma to a human-readable color name.
 * Returns "neutral" for achromatic colors (chroma < 0.01).
 */
export function hueToName(hue: number, chroma: number): string {
  if (chroma < 0.01) return 'neutral';
  const h = ((hue % 360) + 360) % 360;
  for (const { max, name } of HUE_NAMES) {
    if (h < max) return name;
  }
  return 'pink';
}
```

**Step 4: Run test to verify it passes**

Run: `npm test --workspace=@huelab/core -- --run -t "hueToName"`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test --workspace=@huelab/core -- --run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/core/src/oklch.ts packages/core/src/__tests__/oklch.test.ts
git commit -m "feat(core): add hueToName() utility for human-readable color names"
```

---

### Task 2: Native color picker in ColorPicker component

**Files:**
- Modify: `packages/webapp/src/components/ColorPicker.tsx`

**Step 1: Replace the inert swatch div with `<input type="color">`**

In `packages/webapp/src/components/ColorPicker.tsx`, replace lines 79–84 (the color well `<div>`) with a native color input styled to look like a swatch:

Replace:
```tsx
        {/* Color well */}
        <div
          className="h-9 w-9 shrink-0 rounded-md border border-neutral-700"
          style={{ backgroundColor: isValidHex(inputValue) ? inputValue : value }}
          aria-label="Color preview"
        />
```

With:
```tsx
        {/* Native color picker styled as swatch */}
        <input
          type="color"
          value={isValidHex(inputValue) ? normalizeHex(inputValue) : value}
          onChange={(e) => {
            const hex = e.target.value.toLowerCase();
            setInputValue(hex);
            setIsInvalid(false);
            onChange(hex);
          }}
          className="h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border border-neutral-700 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-none"
          aria-label={label ? `${label} color picker` : 'Color picker'}
        />
```

Key changes:
- `<div>` becomes `<input type="color">`
- `onChange` fires immediately and calls `onChange(hex)` (no commit-on-blur needed for the native picker)
- Webkit/Moz pseudo-element styles remove the default browser chrome

**Step 2: Verify in browser**

Run: `npm run dev` (should already be running)
1. Open http://localhost:5173/
2. Add a ramp
3. Click the color swatch → OS color picker should open
4. Pick a color → hex input updates, ramp regenerates
5. Type a hex in the text input → swatch updates

**Step 3: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/webapp/src/components/ColorPicker.tsx
git commit -m "feat(webapp): replace color swatch with native OS color picker"
```

---

### Task 3: Editable ramp names + smart defaults

**Files:**
- Modify: `packages/webapp/src/types.ts` (add RENAME_RAMP action)
- Modify: `packages/webapp/src/store.tsx` (add RENAME_RAMP reducer case)
- Modify: `packages/webapp/src/components/RampEditor.tsx` (click-to-edit name)
- Modify: `packages/webapp/src/components/RampOverview.tsx` (hue-based default name)

**Step 1: Add RENAME_RAMP action type**

In `packages/webapp/src/types.ts`, add to the `ProjectAction` union (after the `UPDATE_RAMP_PARAMS` line):

```ts
  | { type: 'RENAME_RAMP'; index: number; name: string }
```

**Step 2: Add RENAME_RAMP reducer case**

In `packages/webapp/src/store.tsx`, add a new case after the `UPDATE_RAMP_PARAMS` case (after line 135):

```ts
    case 'RENAME_RAMP': {
      if (action.index < 0 || action.index >= state.ramps.length) {
        return state;
      }
      const oldName = state.ramps[action.index].name;
      const newName = action.name.trim();
      if (!newName || newName === oldName) return state;
      const newRamps = state.ramps.map((r, i) =>
        i === action.index ? { ...r, name: newName } : r,
      );
      // Cascade rename through token mapping
      const newMapping = state.tokenMapping.map(token => {
        let updated = token;
        if (token.light.type === 'ramp' && token.light.ramp === oldName) {
          updated = { ...updated, light: { ...token.light, ramp: newName } };
        }
        if (token.dark.type === 'ramp' && token.dark.ramp === oldName) {
          updated = { ...updated, dark: { ...token.dark, ramp: newName } };
        }
        return updated;
      });
      return {
        ...state,
        ramps: newRamps,
        tokenMapping: newMapping,
      };
    }
```

Also add the `hueToName` and `parseColor` imports at the top of store.tsx:

```ts
import {
  generateRamp,
  applyOverride,
  clearOverride,
  getStops,
  resolveTokens,
  auditTokenPairs,
  hueToName,
  parseColor,
} from '@huelab/core';
```

**Step 3: Update RampOverview to use hue-based default names**

In `packages/webapp/src/components/RampOverview.tsx`:

Add import:
```ts
import { hueToName, parseColor } from '@huelab/core';
```

Replace the `handleAddRamp` callback (lines 32-38):

```ts
  const handleAddRamp = useCallback(() => {
    const baseColor = '#3366cc';
    const parsed = parseColor(baseColor);
    const baseName = parsed ? hueToName(parsed.h, parsed.c) : 'color';
    // Deduplicate: if "blue" exists, try "blue-2", "blue-3", etc.
    const existingNames = new Set(state.ramps.map(r => r.name));
    let name = baseName;
    let suffix = 2;
    while (existingNames.has(name)) {
      name = `${baseName}-${suffix}`;
      suffix++;
    }
    dispatch({
      type: 'ADD_RAMP',
      name,
      params: { baseColor, chromaCurve: 'natural', hueShift: 0 },
    });
  }, [dispatch, state.ramps]);
```

**Step 4: Add click-to-edit name in RampEditor**

In `packages/webapp/src/components/RampEditor.tsx`:

Add `useState` to the import:
```ts
import { useCallback, useState } from 'react';
```

Inside the `RampEditor` function, before the handlers, add editing state:

```ts
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
```

Add a rename handler after the existing handlers:

```ts
  const handleRenameCommit = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== ramp.name) {
      dispatch({
        type: 'RENAME_RAMP',
        index: state.selectedRampIndex,
        name: trimmed,
      });
    }
    setEditingName(false);
  }, [nameValue, ramp, state.selectedRampIndex, dispatch]);
```

Replace the ramp name section (lines 93-100):

```tsx
      {/* Ramp name (click to edit) */}
      <div>
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameCommit();
              if (e.key === 'Escape') setEditingName(false);
            }}
            className="w-full rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-sm font-semibold text-neutral-200 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        ) : (
          <h2
            className="cursor-pointer text-sm font-semibold text-neutral-200 hover:text-white"
            onClick={() => {
              setNameValue(ramp.name);
              setEditingName(true);
            }}
            title="Click to rename"
          >
            {ramp.name}
          </h2>
        )}
        <p className="text-xs text-neutral-500">
          {ramp.stops.length} stops &middot; base at {ramp.baseStopId}
        </p>
      </div>
```

**Step 5: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 6: Verify in browser**

1. Click "Add ramp" → name should be "blue" (not `color-1234567890`)
2. Click "Add ramp" again → name should be "blue-2"
3. Click the ramp name in the left panel → becomes editable input
4. Type "primary" + Enter → name updates everywhere
5. Press Escape → cancels editing

**Step 7: Commit**

```bash
git add packages/webapp/src/types.ts packages/webapp/src/store.tsx packages/webapp/src/components/RampEditor.tsx packages/webapp/src/components/RampOverview.tsx
git commit -m "feat(webapp): editable ramp names with hue-based auto-naming"
```

---

### Task 4: Fix Token Map selection persistence

**Files:**
- Modify: `packages/webapp/src/store.tsx:174-186` (SET_TOKEN_SOURCE case)

**Step 1: Fix the reducer**

The bug: `SET_TOKEN_SOURCE` uses `.map()` over `tokenMapping`, which does nothing if the token isn't already in the array. The preset's `defaultMapping` is `[]`, so no tokens are present initially.

In `packages/webapp/src/store.tsx`, replace the `SET_TOKEN_SOURCE` case (lines 174-186):

```ts
    case 'SET_TOKEN_SOURCE': {
      let found = false;
      const newMapping = state.tokenMapping.map(token => {
        if (token.name !== action.tokenName) return token;
        found = true;
        return {
          ...token,
          [action.mode]: action.source,
        };
      });
      if (!found) {
        const unset: TokenSource = { type: 'literal', value: 'transparent' };
        newMapping.push({
          name: action.tokenName,
          light: action.mode === 'light' ? action.source : unset,
          dark: action.mode === 'dark' ? action.source : unset,
        });
      }
      return {
        ...state,
        tokenMapping: newMapping,
      };
    }
```

Also add `TokenSource` to the imports from `@huelab/core` if not already present. Check the existing import line — it imports from `@huelab/core` but `TokenSource` is only used in `types.ts`. Add it:

```ts
import type { AuditReport, TokenSource } from '@huelab/core';
```

**Step 2: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Verify in browser**

1. Add a ramp
2. In Token Map, pick a light source for `--background` from the dropdown
3. Selection should persist (not revert to "Select...")
4. The swatch should update to show the chosen color

**Step 4: Commit**

```bash
git add packages/webapp/src/store.tsx
git commit -m "fix(webapp): token source selection now persists for unmapped tokens"
```

---

### Task 5: Fix Token Map description layout shift

**Files:**
- Modify: `packages/webapp/src/components/TokenRow.tsx:107-117`

**Step 1: Replace inline description with tooltip**

In `packages/webapp/src/components/TokenRow.tsx`, replace lines 108-117 (the token name + description container):

```tsx
      {/* Token name & description tooltip */}
      <div className="relative w-48 shrink-0">
        <span className="text-sm font-mono text-neutral-200 truncate block">{tokenName}</span>
        {description && (
          <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden rounded bg-neutral-700 px-2 py-1 text-[11px] text-neutral-300 shadow-lg group-hover:block whitespace-nowrap">
            {description}
          </div>
        )}
      </div>
```

Key changes:
- Outer `<div>` is now `relative w-48 shrink-0` — fixed width, no growth
- Token name is `truncate block` — stays on one line, clips if too long
- Description is `absolute` positioned below (`top-full`), outside document flow
- Uses `hidden group-hover:block` on the absolute element — no layout shift since it's positioned out of flow
- `pointer-events-none` so it doesn't interfere with clicking elements below it
- `whitespace-nowrap` keeps tooltip on one line

**Step 2: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Verify in browser**

1. Hover over a token row → description appears as a tooltip below the name
2. The "L Select..." and "D Select..." dropdowns do NOT shift position
3. Click a dropdown → it works normally, tooltip disappears when mouse leaves the row

**Step 4: Commit**

```bash
git add packages/webapp/src/components/TokenRow.tsx
git commit -m "fix(webapp): token description tooltip no longer causes layout shift"
```

---

### Task 6: Final verification

**Step 1: Run full test suite**

Run: `npm test --workspace=@huelab/core -- --run`
Expected: All tests PASS

**Step 2: Type check all packages**

Run: `npm run typecheck`
Expected: No errors

**Step 3: End-to-end browser walkthrough**

1. Open http://localhost:5173/
2. Click "Add ramp" → name is "blue", color swatch is clickable
3. Click the swatch → OS color picker opens, pick a color → ramp updates live
4. Click ramp name "blue" → edit inline, rename to "primary", press Enter
5. Add another ramp → named "blue" (or "blue-2" if blue still exists)
6. In Token Map, select a source for `--background` → selection persists
7. Hover over token names → tooltip appears, no layout shift
