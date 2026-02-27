# localStorage Persistence Design

**Issue**: #6 — Add localStorage persistence to preserve webapp state across refreshes
**Date**: 2026-02-27

## Problem

The webapp loses all user work (ramps, token mappings, settings) on browser refresh. There is no persistence layer.

## Approach

Save the entire `ProjectState` to localStorage on every reducer dispatch. Restore on app load.

### Storage Format

Single localStorage key `"huelab:project"` with a versioned envelope:

```json
{ "version": 1, "state": { ...ProjectState } }
```

The `version` field supports future schema migrations without data loss.

### What Gets Persisted

All `ProjectState` fields: `ramps`, `selectedRampIndex`, `tokenMapping`, `preset`, `mode`, `systemSettings`.

### Save Mechanism

A `persistReducer` wrapper around the existing `projectReducer`:

1. Calls the real reducer to get the next state
2. Writes `JSON.stringify({ version: 1, state: nextState })` to localStorage
3. Returns the next state unchanged

Applied in `ProjectProvider` — no component code changes.

### Load Mechanism

A `loadState()` function produces the initial state for `useReducer`:

1. Read `localStorage.getItem("huelab:project")`
2. If found and `version === 1`, parse and return the stored state
3. Otherwise fall back to current defaults (empty ramps, shadcnPreset, light mode)

### Error Handling

- **Corrupt data**: `try/catch` around `JSON.parse`, fall back to defaults, console warning.
- **Storage full**: `try/catch` around `setItem`, log warning, app continues without persistence.
- **Private browsing**: Some browsers throw on localStorage access. Degrade gracefully.

### Undo/Redo Compatibility

The `persistReducer` wrapper pattern is composable. A future undo/redo feature can wrap the reducer independently — persistence saves `present` state, undo history stays session-only. No conflicts.

## Out of Scope

- Multiple save slots / named projects
- Undo/redo history persistence
- Cloud sync
- Auto-export on save
- Schema migration logic beyond version check (v1 only)

## Files Changed

- `packages/webapp/src/store.tsx` — add `persistReducer`, `loadState`, wire into `ProjectProvider`
