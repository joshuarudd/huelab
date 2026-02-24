/**
 * Raw JSON export — ramp data, token mappings.
 *
 * Serializes ramps and resolved tokens to pretty-printed JSON strings.
 * All functions are pure: immutable data in, immutable data out.
 *
 * Reference: collabrios/src/lib/format.ts (formatRampJson)
 */

import type { Ramp, ResolvedToken } from './types.js';

/**
 * Export a single ramp as a pretty-printed JSON string.
 *
 * Includes the ramp name, params, base stop ID, and all stops
 * with their computed color values.
 */
export function exportRampJSON(ramp: Ramp): string {
  return JSON.stringify(ramp, null, 2);
}

/**
 * Export an array of resolved tokens as a pretty-printed JSON string.
 *
 * Each entry includes the token name, light/dark Color objects,
 * and source labels for traceability.
 */
export function exportTokensJSON(tokens: ResolvedToken[]): string {
  return JSON.stringify(tokens, null, 2);
}
