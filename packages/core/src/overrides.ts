/**
 * Per-stop override system for ramps.
 *
 * All functions are pure: immutable data in, immutable data out.
 * Override individual L/C/H components at specific stops while
 * keeping the rest algorithmically generated.
 */

import { converter, formatHex } from 'culori';
import type { Oklch } from 'culori';
import { clampToSrgb } from './oklch.js';
import { generateRamp } from './ramp.js';
import type { OklchColor, Ramp, RampStop, StopDefinition, Color } from './types.js';

const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// Helper: build a Color from OKLCH values (gamut-clamped)
// ---------------------------------------------------------------------------

/**
 * Construct a full Color object from OKLCH components.
 * Clamps to sRGB gamut, then converts to hex and RGB.
 */
function oklchToColor(l: number, c: number, h: number): Color {
  const clamped = clampToSrgb({ l, c, h });

  const culoriOklch: Oklch = {
    mode: 'oklch',
    l: clamped.l,
    c: clamped.c,
    h: clamped.h,
  };

  const hex = formatHex(culoriOklch);
  const rgb = toRgb(culoriOklch);

  return {
    oklch: {
      l: clamped.l,
      c: clamped.c,
      h: clamped.h,
    },
    hex,
    rgb: {
      r: Math.round(rgb.r * 255) || 0,
      g: Math.round(rgb.g * 255) || 0,
      b: Math.round(rgb.b * 255) || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// applyOverride
// ---------------------------------------------------------------------------

/**
 * Apply per-stop overrides to a ramp.
 *
 * Returns a new Ramp with the override applied at the specified stop.
 * The affected stop uses overridden values for specified components (l, c, h)
 * and algorithmic values for the rest. The stop is gamut-clamped and converted
 * to a full Color.
 *
 * Other stops are preserved as-is (including any existing overrides).
 */
export function applyOverride(
  ramp: Ramp,
  stopId: number,
  overrides: Partial<OklchColor>,
  stops: StopDefinition[],
): Ramp {
  // Generate a fresh algorithmic ramp to get baseline L/C/H values
  const algorithmic = generateRamp(ramp.name, ramp.params, stops);

  // Find the algorithmic baseline for the target stop
  const algoStop = algorithmic.stops.find(s => s.id === stopId);
  if (!algoStop) {
    throw new Error(`Stop ${stopId} not found in ramp`);
  }

  // Merge: use override values where provided, algorithmic values otherwise
  const baseOklch = algoStop.color.oklch;
  const mergedL = overrides.l !== undefined ? overrides.l : baseOklch.l;
  const mergedC = overrides.c !== undefined ? overrides.c : baseOklch.c;
  const mergedH = overrides.h !== undefined ? overrides.h : baseOklch.h;

  // Gamut clamp and build full Color
  const color = oklchToColor(mergedL, mergedC, mergedH);

  // Build the overridden stop
  const overriddenStop: RampStop = {
    id: stopId,
    color,
    overridden: true,
    overrides,
  };

  // Replace the target stop, preserve all other stops as-is
  const newStops = ramp.stops.map(stop =>
    stop.id === stopId ? overriddenStop : stop,
  );

  return {
    ...ramp,
    stops: newStops,
  };
}

// ---------------------------------------------------------------------------
// clearOverride
// ---------------------------------------------------------------------------

/**
 * Clear the override at a specific stop, regenerating it algorithmically.
 *
 * Returns a new Ramp with the specified stop restored to its algorithmic
 * value. Other stops (including any overrides) are preserved.
 */
export function clearOverride(
  ramp: Ramp,
  stopId: number,
  stops: StopDefinition[],
): Ramp {
  // Generate a fresh algorithmic ramp to get the baseline stop
  const algorithmic = generateRamp(ramp.name, ramp.params, stops);

  const algoStop = algorithmic.stops.find(s => s.id === stopId);
  if (!algoStop) {
    throw new Error(`Stop ${stopId} not found in ramp`);
  }

  // The algorithmic stop already has overridden: false and no overrides
  const newStops = ramp.stops.map(stop =>
    stop.id === stopId ? algoStop : stop,
  );

  return {
    ...ramp,
    stops: newStops,
  };
}

// ---------------------------------------------------------------------------
// clearAllOverrides
// ---------------------------------------------------------------------------

/**
 * Clear all overrides, regenerating all stops algorithmically.
 *
 * Returns a new Ramp with all stops restored to their algorithmic values.
 */
export function clearAllOverrides(
  ramp: Ramp,
  stops: StopDefinition[],
): Ramp {
  // Simply regenerate the entire ramp from scratch
  return generateRamp(ramp.name, ramp.params, stops);
}
