/**
 * Perceptual distance — deltaE OK, component decomposition.
 *
 * All functions are pure: immutable data in, immutable data out.
 * Uses culori's differenceEuclidean for perceptual distance in OKLCH space.
 */

import { differenceEuclidean } from 'culori';
import type { Oklch } from 'culori';
import type { OklchColor } from './types.js';
import { hueDifference } from './oklch.js';

/** Euclidean distance function in OKLCH space */
const distFn = differenceEuclidean('oklch');

/**
 * Convert our OklchColor to a culori Oklch object.
 */
function toCuloriOklch(color: OklchColor): Oklch {
  return {
    mode: 'oklch',
    l: color.l,
    c: color.c,
    h: color.h,
  };
}

/**
 * Compute the perceptual distance (deltaE OK) between two OKLCH colors.
 * Uses culori's Euclidean distance in OKLCH space, which handles hue
 * wrapping correctly.
 *
 * Returns 0 for identical colors, positive for different colors.
 * The result is symmetric: deltaEOK(a, b) === deltaEOK(b, a).
 *
 * Note: culori's distance function can return tiny non-zero values
 * (e.g., 2e-17) for identical colors due to float precision in
 * hue-to-radians trig. We clamp values below an epsilon to 0.
 */
export function deltaEOK(a: OklchColor, b: OklchColor): number {
  const d = distFn(toCuloriOklch(a), toCuloriOklch(b));
  return d < 1e-10 ? 0 : d;
}

/**
 * Decompose the difference between two OKLCH colors into individual
 * component deltas: lightness (dL), chroma (dC), and hue (dH).
 *
 * - dL: Absolute lightness difference (0-1 range)
 * - dC: Absolute chroma difference
 * - dH: Shortest angular hue difference (0-180 degrees), wraparound-safe
 */
export function oklchComponents(
  a: OklchColor,
  b: OklchColor,
): { dL: number; dC: number; dH: number } {
  return {
    dL: Math.abs(a.l - b.l),
    dC: Math.abs(a.c - b.c),
    dH: hueDifference(a.h, b.h),
  };
}
