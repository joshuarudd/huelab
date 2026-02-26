# UX Polish: Color Picker, Ramp Naming, Token Map Fixes

**Date:** 2026-02-26
**Status:** Approved

## Problem

The webapp has three UX issues that make it hard to use:

1. The color picker is hex-text-only — users expect a visual color picker when clicking the swatch
2. Ramp names are auto-generated timestamps (`color-1772140032832`) with no way to rename
3. Token Map: selections silently drop, and hover descriptions cause layout shift that moves click targets

## Design

### 1. Visual Color Picker

The existing hex text input stays. The inert color swatch beside it becomes a native `<input type="color">` styled to look like the current swatch (rounded square). Clicking opens the OS system color wheel (macOS color picker, etc.). Both inputs sync bidirectionally through the existing `value` prop.

**Files:** `packages/webapp/src/components/ColorPicker.tsx`

### 2. Ramp Naming

#### Auto-naming on create

Add a `hueToName(hue, chroma)` utility to `@huelab/core` that maps OKLCH hue angles to human-readable color names:

| Hue range | Name |
|-----------|------|
| 0-20, 335-360 | pink |
| 20-45 | red |
| 45-65 | orange |
| 65-90 | amber |
| 90-115 | yellow |
| 115-145 | lime |
| 145-175 | green |
| 175-200 | emerald |
| 200-230 | cyan |
| 230-260 | sky |
| 260-285 | blue |
| 285-310 | indigo |
| 310-335 | purple |
| chroma < 0.01 | neutral |

When "Add ramp" is clicked, the default base color's hue determines the name. If a ramp with that name already exists, append a suffix ("blue-2", "blue-3").

#### Rename in RampEditor

The ramp name `<h2>` becomes a click-to-edit text field. Click the name to enter edit mode, type a new name, press Enter to commit (Escape to cancel). A new `RENAME_RAMP` reducer action updates the ramp name and cascades the rename through all `tokenMapping` entries referencing that ramp.

**Files:** `packages/core/src/oklch.ts`, `packages/core/src/index.ts`, `packages/webapp/src/components/RampEditor.tsx`, `packages/webapp/src/components/RampOverview.tsx`, `packages/webapp/src/store.tsx`

### 3. Token Map Bug Fixes

#### Selection not persisting

**Root cause:** The preset's `defaultMapping` is `[]`, so `tokenMapping` starts empty. The `SET_TOKEN_SOURCE` reducer uses `.map()` which silently does nothing for tokens not in the array.

**Fix:** After the `.map()`, if the token wasn't found, append a new `TokenDefinition` entry. First selection for any token always works.

**File:** `packages/webapp/src/store.tsx`

#### Description layout shift

**Root cause:** The description `<span>` uses `hidden group-hover:inline` inside a `min-w-40` container. When visible, it widens the flex column, pushing dropdowns right.

**Fix:** Replace with a floating tooltip/popover. On hover, the description appears as an absolutely-positioned element near the token name — outside document flow, so nothing shifts.

**File:** `packages/webapp/src/components/TokenRow.tsx`
