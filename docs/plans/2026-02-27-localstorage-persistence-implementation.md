# localStorage Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-save and restore the full `ProjectState` to/from localStorage so refreshing the browser preserves all user work.

**Architecture:** A `persistReducer` wrapper saves state on every dispatch. A `loadState` function hydrates initial state from localStorage on mount. Both live in `store.tsx` — the only file that changes. A versioned envelope (`{ version: 1, state }`) enables future schema migrations.

**Tech Stack:** React (useReducer), localStorage, JSON serialization

---

### Task 1: Add `loadState` function

**Files:**
- Modify: `packages/webapp/src/store.tsx:34-48`

**Step 1: Add the storage key constant and `loadState` function**

Add this between the imports and `initialState`:

```typescript
// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'huelab:project';
const STORAGE_VERSION = 1;

interface StorageEnvelope {
  version: number;
  state: ProjectState;
}

/**
 * Load persisted state from localStorage.
 * Returns the stored ProjectState if valid, or null to use defaults.
 */
function loadState(): ProjectState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const envelope: StorageEnvelope = JSON.parse(raw);
    if (envelope.version !== STORAGE_VERSION) return null;
    return envelope.state;
  } catch {
    console.warn('huelab: failed to load saved state, using defaults');
    return null;
  }
}
```

**Step 2: Update `initialState` to use loaded state**

Change the `initialState` declaration from a const to use `loadState`:

```typescript
const defaultState: ProjectState = {
  ramps: [],
  selectedRampIndex: 0,
  tokenMapping: [...shadcnPreset.tokenSchema.defaultMapping],
  preset: shadcnPreset,
  mode: 'dark',
  systemSettings: {
    chromaCurve: 'natural',
    autoHueShift: true,
  },
};

const initialState: ProjectState = loadState() ?? defaultState;
```

**Step 3: Verify the app still boots**

Run: `npm run dev` and confirm the app loads without errors in the browser console.

**Step 4: Commit**

```bash
git add packages/webapp/src/store.tsx
git commit -m "feat: add loadState for localStorage hydration (#6)"
```

---

### Task 2: Add `saveState` function and wire into reducer

**Files:**
- Modify: `packages/webapp/src/store.tsx`

**Step 1: Add the `saveState` function**

Add this after `loadState`:

```typescript
/**
 * Persist state to localStorage. Fails silently (e.g., storage full,
 * private browsing) so the app continues working without persistence.
 */
function saveState(state: ProjectState): void {
  try {
    const envelope: StorageEnvelope = { version: STORAGE_VERSION, state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    console.warn('huelab: failed to save state to localStorage');
  }
}
```

**Step 2: Create the `persistReducer` wrapper**

Add this after `saveState`:

```typescript
/**
 * Wraps projectReducer to auto-save state after every dispatch.
 */
function persistReducer(
  state: ProjectState,
  action: ProjectAction,
): ProjectState {
  const nextState = projectReducer(state, action);
  if (nextState !== state) {
    saveState(nextState);
  }
  return nextState;
}
```

Note: the `nextState !== state` check avoids unnecessary writes when the reducer returns the same state (e.g., no-op actions like removing an out-of-bounds index).

**Step 3: Wire `persistReducer` into `ProjectProvider`**

In `ProjectProvider`, change the `useReducer` call:

```typescript
// Before:
const [state, dispatch] = useReducer(projectReducer, initialState);

// After:
const [state, dispatch] = useReducer(persistReducer, initialState);
```

**Step 4: Manual test — verify persistence works**

Run: `npm run dev`
1. Add a ramp (any color)
2. Refresh the browser
3. Confirm the ramp is still there
4. Open DevTools → Application → Local Storage → look for `huelab:project` key
5. Confirm it contains a JSON object with `version: 1` and the state

**Step 5: Commit**

```bash
git add packages/webapp/src/store.tsx
git commit -m "feat: auto-save state to localStorage on every dispatch (#6)"
```

---

### Task 3: Add `[Unreleased]` changelog entry

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Add an `[Unreleased]` section at the top of CHANGELOG.md**

Add after the header:

```markdown
## [Unreleased]

### Added

- Webapp state (ramps, token mappings, settings) now persists to localStorage and restores on page reload (#6)
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "feat: add changelog entry for localStorage persistence (#6)"
```

---

### Task 4: Final verification

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

**Step 2: Run full test suite**

Run: `npm test --workspace=@huelab/core`
Expected: All tests pass.

**Step 3: End-to-end manual test**

Run: `npm run dev`
1. Start fresh (clear localStorage in DevTools first)
2. Add 2-3 ramps with different colors
3. Edit token mappings
4. Toggle light/dark mode
5. Refresh → all state is preserved
6. Open a private/incognito window → app loads with defaults (no stored state), no errors in console

**Step 4: Commit any fixes if needed, then push**

```bash
git push -u origin feat/6-localstorage-persistence
```
