/**
 * Token resolver — resolves token definitions against loaded ramps
 * to produce concrete Color values for light and dark modes.
 *
 * All functions are pure: immutable data in, immutable data out.
 */

import { toColor } from './oklch.js';
import type { TokenDefinition, TokenSource, Ramp, Color, ResolvedToken } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a single TokenSource to a concrete Color and source label.
 *
 * - Ramp sources: find the ramp by name, find the stop by ID, return its Color.
 *   Source label is "{ramp}-{stop}".
 * - Literal sources: parse the CSS color string via toColor().
 *   Source label is "literal".
 *
 * Throws if a referenced ramp or stop doesn't exist.
 */
function resolveSource(
  source: TokenSource,
  ramps: Ramp[],
): { color: Color; sourceLabel: string } {
  if (source.type === 'literal') {
    return {
      color: toColor(source.value),
      sourceLabel: 'literal',
    };
  }

  // source.type === 'ramp'
  const ramp = ramps.find((r) => r.name === source.ramp);
  if (!ramp) {
    throw new Error(
      `Ramp "${source.ramp}" not found. Available ramps: ${ramps.map((r) => r.name).join(', ') || '(none)'}`,
    );
  }

  const stop = ramp.stops.find((s) => s.id === source.stop);
  if (!stop) {
    throw new Error(
      `Stop ${source.stop} not found in ramp "${source.ramp}". Available stops: ${ramp.stops.map((s) => s.id).join(', ')}`,
    );
  }

  return {
    color: stop.color,
    sourceLabel: `${source.ramp}-${source.stop}`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve an array of token definitions against a set of ramps.
 *
 * Each token's light and dark sources are resolved independently to produce
 * concrete Color values with source labels for traceability.
 *
 * @param tokens - The token definitions to resolve
 * @param ramps - The available color ramps
 * @returns An array of ResolvedToken objects
 * @throws If a referenced ramp or stop doesn't exist
 */
export function resolveTokens(
  tokens: TokenDefinition[],
  ramps: Ramp[],
): ResolvedToken[] {
  return tokens.map((token) => {
    const light = resolveSource(token.light, ramps);
    const dark = resolveSource(token.dark, ramps);

    return {
      name: token.name,
      light: light.color,
      dark: dark.color,
      lightSource: light.sourceLabel,
      darkSource: dark.sourceLabel,
    };
  });
}
