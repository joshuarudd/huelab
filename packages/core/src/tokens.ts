/**
 * Token schema definition and helpers.
 *
 * Convenience functions for creating TokenSource objects.
 * All functions are pure: immutable data in, immutable data out.
 */

import type { TokenSource } from './types.js';

/**
 * Create a ramp-based token source.
 *
 * The resolved value will be looked up from the named ramp at the given stop.
 */
export function rampSource(ramp: string, stop: number): TokenSource {
  return { type: 'ramp', ramp, stop };
}

/**
 * Create a literal token source.
 *
 * The value is a CSS color string (hex, oklch(), etc.) that will be
 * parsed directly rather than looked up from a ramp.
 */
export function literalSource(value: string): TokenSource {
  return { type: 'literal', value };
}
