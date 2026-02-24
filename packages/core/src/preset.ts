/**
 * Preset system — load and validate presets.
 *
 * Presets are plain objects conforming to the Preset interface.
 * All functions are pure: immutable data in, immutable data out.
 */

import type { Preset, StopDefinition } from './types.js';

/**
 * Validate that a preset has all required fields.
 *
 * Throws descriptive errors if the preset is malformed.
 * Does NOT mutate the preset.
 */
export function validatePreset(preset: Preset): void {
  if (!preset.name) {
    throw new Error('Preset must have a name');
  }
  if (!preset.stops.length) {
    throw new Error('Preset must define at least one stop');
  }
  if (!preset.tokenSchema.tokens.length) {
    throw new Error('Preset must define at least one token');
  }
}

/**
 * Get stop definitions from a preset.
 *
 * Returns the preset's stop definitions array.
 */
export function getStops(preset: Preset): StopDefinition[] {
  return preset.stops;
}
