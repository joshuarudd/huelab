# Auto-Suggest Ramp Names on Base Color Change

**Date:** 2026-02-26
**Status:** Approved
**Issue:** #3

## Problem

When a user adds a ramp, it gets a hue-based name (e.g. "blue"). When they change the base color to orange, the name stays "blue". There's no indication that the name is stale.

## Design

### Approach: Always suggest, never auto-rename

When the base color changes, compute `hueToName()` for the new color. If the suggested name differs from the current ramp name (stripping any `-2`, `-3` suffix for comparison), show a suggestion hint in the RampEditor. The user clicks to accept or ignores it.

**No auto-renaming happens silently.** The name only changes when the user explicitly accepts the suggestion or manually edits. This means:

- No `rampNamesOverridden` tracking state needed
- No flags on the Ramp type
- The `UPDATE_RAMP_PARAMS` reducer does not touch the name
- The suggestion is purely a UI concern in `RampEditor.tsx`

### Suggestion UI

In the RampEditor, below the ramp name (between the name heading and the "N stops" subtitle), when the suggested hue name differs from the current name:

```
blue                    ← current name (click to edit)
Rename to "orange"?     ← clickable suggestion link
11 stops · base at 500
```

Clicking the suggestion dispatches `RENAME_RAMP` with the suggested name (deduplicated with suffix if needed).

When the suggested name matches the current name (or its base without suffix), the hint is hidden.

### Deduplication on accept

When the user accepts the suggestion, apply the same suffix logic used in `RampOverview.handleAddRamp`: if "orange" exists, suggest "orange-2", etc.

### Files affected

- `packages/webapp/src/components/RampEditor.tsx` — add suggestion UI
- No store/reducer/type changes needed
