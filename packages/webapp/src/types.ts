/**
 * Webapp-specific types for the project store.
 *
 * Defines the project state shape and all reducer actions.
 * The state represents a single "project" containing ramps,
 * token mappings, a preset, and a mode toggle.
 */

import type {
  Ramp,
  TokenDefinition,
  Preset,
  OklchColor,
  RampParams,
  TokenSource,
  ResolvedToken,
  AuditReport,
  ChromaCurve,
} from '@huelab/core';

/** System-wide settings that apply to all ramps */
export interface SystemSettings {
  chromaCurve: ChromaCurve;
  autoHueShift: boolean;
}

/** The full project state managed by useReducer */
export interface ProjectState {
  ramps: Ramp[];
  selectedRampIndex: number;
  tokenMapping: TokenDefinition[];
  preset: Preset;
  mode: 'light' | 'dark';
  systemSettings: SystemSettings;
}

/** All actions the project reducer can handle */
export type ProjectAction =
  | { type: 'SET_RAMPS'; ramps: Ramp[] }
  | { type: 'ADD_RAMP'; name: string; params: RampParams }
  | { type: 'REMOVE_RAMP'; index: number }
  | { type: 'SELECT_RAMP'; index: number }
  | { type: 'UPDATE_RAMP_PARAMS'; index: number; params: RampParams }
  | { type: 'RENAME_RAMP'; index: number; name: string }
  | { type: 'OVERRIDE_STOP'; rampIndex: number; stopId: number; overrides: Partial<OklchColor> }
  | { type: 'CLEAR_OVERRIDE'; rampIndex: number; stopId: number }
  | { type: 'SET_TOKEN_SOURCE'; tokenName: string; mode: 'light' | 'dark'; source: TokenSource }
  | { type: 'SET_TOKEN_MAPPING'; tokens: TokenDefinition[] }
  | { type: 'SET_PRESET'; preset: Preset }
  | { type: 'TOGGLE_MODE' }
  | { type: 'SET_CHROMA_CURVE'; curve: ChromaCurve }
  | { type: 'SET_AUTO_HUE_SHIFT'; enabled: boolean };

/** The context value exposed by ProjectProvider */
export interface ProjectContextValue {
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
  resolvedTokens: ResolvedToken[];
  auditReport: AuditReport;
}
