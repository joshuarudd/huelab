/**
 * Project store — React context + useReducer for webapp state.
 *
 * Provides:
 * - projectReducer: handles all ProjectAction types
 * - ProjectContext: React context for state + dispatch + derived data
 * - ProjectProvider: wraps the app, computes derived state via useMemo
 * - useProject(): custom hook for consuming the project context
 *
 * Derived state (resolvedTokens, auditReport) is recomputed on every
 * change to ramps or token mappings via useMemo.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from 'react';
import {
  generateRamp,
  applyOverride,
  clearOverride,
  getStops,
  resolveTokens,
  auditTokenPairs,
} from '@huelab/core';
import { shadcnPreset } from '@huelab/preset-shadcn';
import type { ProjectState, ProjectAction, ProjectContextValue } from './types.js';
import type { AuditReport } from '@huelab/core';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ProjectState = {
  ramps: [],
  selectedRampIndex: 0,
  tokenMapping: [...shadcnPreset.tokenSchema.defaultMapping],
  preset: shadcnPreset,
  mode: 'light',
};

// ---------------------------------------------------------------------------
// Empty audit report (used when resolution fails or no data)
// ---------------------------------------------------------------------------

const EMPTY_AUDIT_REPORT: AuditReport = {
  pairs: [],
  summary: {
    totalPairs: 0,
    lightPasses: 0,
    darkPasses: 0,
    failures: [],
  },
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function projectReducer(
  state: ProjectState,
  action: ProjectAction,
): ProjectState {
  switch (action.type) {
    case 'SET_RAMPS':
      return {
        ...state,
        ramps: action.ramps,
        selectedRampIndex: action.ramps.length > 0
          ? Math.min(state.selectedRampIndex, action.ramps.length - 1)
          : 0,
      };

    case 'ADD_RAMP': {
      const stops = getStops(state.preset);
      const newRamp = generateRamp(action.name, action.params, stops);
      return {
        ...state,
        ramps: [...state.ramps, newRamp],
        selectedRampIndex: state.ramps.length, // select the newly added ramp
      };
    }

    case 'REMOVE_RAMP': {
      if (action.index < 0 || action.index >= state.ramps.length) {
        return state;
      }
      const newRamps = state.ramps.filter((_, i) => i !== action.index);
      let newIndex = state.selectedRampIndex;
      // If removed ramp was before or at selected, adjust index
      if (newRamps.length === 0) {
        newIndex = 0;
      } else if (state.selectedRampIndex >= newRamps.length) {
        newIndex = newRamps.length - 1;
      } else if (action.index < state.selectedRampIndex) {
        newIndex = state.selectedRampIndex - 1;
      }
      return {
        ...state,
        ramps: newRamps,
        selectedRampIndex: newIndex,
      };
    }

    case 'SELECT_RAMP':
      return {
        ...state,
        selectedRampIndex: Math.max(0, Math.min(action.index, state.ramps.length - 1)),
      };

    case 'UPDATE_RAMP_PARAMS': {
      if (action.index < 0 || action.index >= state.ramps.length) {
        return state;
      }
      const stops = getStops(state.preset);
      const existingRamp = state.ramps[action.index];
      const updatedRamp = generateRamp(existingRamp.name, action.params, stops);
      // Re-apply any existing overrides from the old ramp
      let rampWithOverrides = updatedRamp;
      for (const stop of existingRamp.stops) {
        if (stop.overridden && stop.overrides) {
          rampWithOverrides = applyOverride(rampWithOverrides, stop.id, stop.overrides, stops);
        }
      }
      const newRamps = state.ramps.map((r, i) =>
        i === action.index ? rampWithOverrides : r,
      );
      return {
        ...state,
        ramps: newRamps,
      };
    }

    case 'OVERRIDE_STOP': {
      if (action.rampIndex < 0 || action.rampIndex >= state.ramps.length) {
        return state;
      }
      const stops = getStops(state.preset);
      const ramp = state.ramps[action.rampIndex];
      // Merge new overrides with any existing overrides on this stop
      const existingStop = ramp.stops.find(s => s.id === action.stopId);
      const mergedOverrides = {
        ...(existingStop?.overrides ?? {}),
        ...action.overrides,
      };
      const overriddenRamp = applyOverride(ramp, action.stopId, mergedOverrides, stops);
      const newRamps = state.ramps.map((r, i) =>
        i === action.rampIndex ? overriddenRamp : r,
      );
      return {
        ...state,
        ramps: newRamps,
      };
    }

    case 'CLEAR_OVERRIDE': {
      if (action.rampIndex < 0 || action.rampIndex >= state.ramps.length) {
        return state;
      }
      const stops = getStops(state.preset);
      const clearedRamp = clearOverride(state.ramps[action.rampIndex], action.stopId, stops);
      const newRamps = state.ramps.map((r, i) =>
        i === action.rampIndex ? clearedRamp : r,
      );
      return {
        ...state,
        ramps: newRamps,
      };
    }

    case 'SET_TOKEN_SOURCE': {
      const newMapping = state.tokenMapping.map(token => {
        if (token.name !== action.tokenName) return token;
        return {
          ...token,
          [action.mode]: action.source,
        };
      });
      return {
        ...state,
        tokenMapping: newMapping,
      };
    }

    case 'SET_TOKEN_MAPPING':
      return {
        ...state,
        tokenMapping: action.tokens,
      };

    case 'SET_PRESET':
      return {
        ...state,
        preset: action.preset,
        tokenMapping: [...action.preset.tokenSchema.defaultMapping],
      };

    case 'TOGGLE_MODE':
      return {
        ...state,
        mode: state.mode === 'light' ? 'dark' : 'light',
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // Derived state: resolve tokens against current ramps
  const resolvedTokens = useMemo(() => {
    if (state.tokenMapping.length === 0 || state.ramps.length === 0) {
      return [];
    }
    try {
      return resolveTokens(state.tokenMapping, state.ramps);
    } catch {
      // Gracefully handle unresolvable tokens (e.g., ramp not loaded yet)
      return [];
    }
  }, [state.tokenMapping, state.ramps]);

  // Derived state: audit token pairs against WCAG thresholds
  const auditReport = useMemo(() => {
    if (resolvedTokens.length === 0 || state.preset.tokenSchema.pairs.length === 0) {
      return EMPTY_AUDIT_REPORT;
    }
    try {
      return auditTokenPairs(resolvedTokens, state.preset.tokenSchema.pairs);
    } catch {
      // Gracefully handle missing tokens in audit
      return EMPTY_AUDIT_REPORT;
    }
  }, [resolvedTokens, state.preset]);

  const contextValue = useMemo<ProjectContextValue>(
    () => ({ state, dispatch, resolvedTokens, auditReport }),
    [state, dispatch, resolvedTokens, auditReport],
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the project state, dispatch, and derived data.
 *
 * Must be called within a <ProjectProvider>.
 */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
