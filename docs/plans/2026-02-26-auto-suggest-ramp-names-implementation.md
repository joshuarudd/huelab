# Auto-Suggest Ramp Names Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a "Rename to X?" suggestion in the RampEditor when the base color's hue name differs from the current ramp name.

**Architecture:** Pure UI change in RampEditor. Compute `hueToName()` from the current base color, compare to the ramp name, and render a clickable suggestion link. On click, dispatch `RENAME_RAMP` with a deduplicated name. No state or reducer changes needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `@huelab/core` (hueToName, parseColor)

**Design doc:** `docs/plans/2026-02-26-auto-suggest-ramp-names-design.md`

---

### Task 1: Add rename suggestion UI to RampEditor

**Files:**
- Modify: `packages/webapp/src/components/RampEditor.tsx`

**Step 1: Add imports**

In `packages/webapp/src/components/RampEditor.tsx`, add `useMemo` to the React import and add `hueToName` and `parseColor` from core:

Change line 10:
```ts
import { useCallback, useState } from 'react';
```
To:
```ts
import { useCallback, useMemo, useState } from 'react';
```

Change line 15:
```ts
import type { RampParams, OklchColor } from '@huelab/core';
```
To:
```ts
import { hueToName, parseColor } from '@huelab/core';
import type { RampParams, OklchColor } from '@huelab/core';
```

**Step 2: Add suggestion computation**

After the `handleRenameCommit` callback (after line 85), add a `useMemo` that computes the suggested name and a handler to accept it:

```ts
  // Compute suggested name from current base color's hue
  const suggestedName = useMemo(() => {
    if (!ramp) return null;
    const parsed = parseColor(ramp.params.baseColor);
    if (!parsed) return null;
    const baseName = hueToName(parsed.h, parsed.c);
    // Strip any numeric suffix from current name for comparison (e.g. "blue-2" → "blue")
    const currentBase = ramp.name.replace(/-\d+$/, '');
    if (baseName === currentBase) return null;
    // Deduplicate: if "orange" exists, suggest "orange-2", etc.
    const existingNames = new Set(state.ramps.map(r => r.name));
    let name = baseName;
    let suffix = 2;
    while (existingNames.has(name) && name !== ramp.name) {
      name = `${baseName}-${suffix}`;
      suffix++;
    }
    return name;
  }, [ramp, state.ramps]);

  const handleAcceptSuggestion = useCallback(() => {
    if (!suggestedName || !ramp) return;
    dispatch({
      type: 'RENAME_RAMP',
      index: state.selectedRampIndex,
      name: suggestedName,
    });
  }, [suggestedName, ramp, state.selectedRampIndex, dispatch]);
```

**Step 3: Add suggestion UI to the render**

In the render section, between the name heading and the stops subtitle (between line 133 and line 134), add the suggestion link:

Replace:
```tsx
        )}
        <p className="text-xs text-neutral-500">
          {ramp.stops.length} stops &middot; base at {ramp.baseStopId}
        </p>
```

With:
```tsx
        )}
        {suggestedName && !editingName && (
          <button
            type="button"
            onClick={handleAcceptSuggestion}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Rename to &ldquo;{suggestedName}&rdquo;?
          </button>
        )}
        <p className="text-xs text-neutral-500">
          {ramp.stops.length} stops &middot; base at {ramp.baseStopId}
        </p>
```

Key details:
- Hidden when `editingName` is true (user is already editing the name)
- Hidden when `suggestedName` is null (hue name matches current name)
- Uses `&ldquo;` / `&rdquo;` for smart quotes around the suggested name
- Styled as a subtle blue link

**Step 4: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Verify in browser**

1. Add a ramp (defaults to "blue")
2. Change the base color to orange → "Rename to "orange"?" appears below the name
3. Click the suggestion → name changes to "orange"
4. Suggestion disappears (names match now)
5. Change color to green → "Rename to "green"?" appears
6. Click the name to edit manually → suggestion hides while editing
7. With two ramps named "orange" and change another to orange → suggests "orange-2"

**Step 6: Commit**

```bash
git add packages/webapp/src/components/RampEditor.tsx
git commit -m "feat(webapp): suggest ramp rename when base color hue changes (#3)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
