/**
 * Ramp generation — OKLCH ramps from base color + parameters.
 *
 * All functions are pure: immutable data in, immutable data out.
 * Generates 11-stop OKLCH ramps from a base color with configurable
 * chroma curves and hue shift.
 */

import { converter, formatHex } from 'culori';
import type { Oklch } from 'culori';
import { parseColor, clampToSrgb } from './oklch.js';
import type { RampParams, Ramp, RampStop, StopDefinition, Color, ChromaCurve } from './types.js';

const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// Chroma curve scale factors
// ---------------------------------------------------------------------------

/** Natural bell curve — peaks at midtones (stop 500), muted at extremes */
const NATURAL_SCALES = [0.08, 0.20, 0.45, 0.75, 0.93, 1.00, 0.96, 0.85, 0.70, 0.50, 0.30];

/** Linear curve — smoother ramp from low to high and back */
const LINEAR_SCALES = [0.10, 0.28, 0.46, 0.64, 0.82, 1.00, 0.91, 0.82, 0.73, 0.55, 0.36];

/** Flat curve — uniform chroma, gamut clamping reduces at extremes */
const FLAT_SCALES = [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00];

/** Default hue shift in degrees when autoHueShift is enabled */
export const AUTO_HUE_SHIFT_DEGREES = 10;

/**
 * Get the chroma scale factors for a given curve type.
 */
function getChromaScales(curve: ChromaCurve): readonly number[] {
  switch (curve) {
    case 'natural': return NATURAL_SCALES;
    case 'linear': return LINEAR_SCALES;
    case 'flat': return FLAT_SCALES;
  }
}

// ---------------------------------------------------------------------------
// Helper: build a Color from clamped OKLCH values
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
// Core ramp generation
// ---------------------------------------------------------------------------

/**
 * Find the stop definition whose lightness target is closest to a given
 * lightness value. Returns the stop's id.
 */
function findClosestStopId(lightness: number, stops: StopDefinition[]): number {
  let closestId = stops[0].id;
  let minDiff = Math.abs(stops[0].lightness - lightness);

  for (let i = 1; i < stops.length; i++) {
    const diff = Math.abs(stops[i].lightness - lightness);
    if (diff < minDiff) {
      minDiff = diff;
      closestId = stops[i].id;
    }
  }

  return closestId;
}

/**
 * Generate an OKLCH color ramp from a base color and parameters.
 *
 * Algorithm:
 * 1. Parse base color to OKLCH — extract base chroma and hue
 * 2. Detect achromatic (C < 0.001) — force hue to 0
 * 3. Find closest stop by lightness → baseStopId
 * 4. For each stop definition:
 *    - Use the stop's lightness target
 *    - Scale chroma by curve factor x base chroma
 *    - Apply hue shift when autoHueShift is enabled (linear interpolation)
 *    - Gamut clamp via clampToSrgb (reduce chroma, preserve lightness)
 *    - Build full Color object
 * 5. Return Ramp with name, params, stops, and baseStopId
 *
 * @param name - Name for the ramp
 * @param params - Ramp parameters (baseColor)
 * @param stops - Stop definitions from preset
 * @param chromaCurve - Chroma distribution curve (default: 'natural')
 * @param autoHueShift - Whether to apply automatic hue shift (default: false)
 */
export function generateRamp(
  name: string,
  params: RampParams,
  stops: StopDefinition[],
  chromaCurve: ChromaCurve = 'natural',
  autoHueShift: boolean = false,
): Ramp {
  const baseOklch = parseColor(params.baseColor);
  if (!baseOklch) {
    throw new Error(`Invalid base color: ${params.baseColor}`);
  }

  const baseChroma = baseOklch.c;
  const isAchromatic = baseChroma < 0.001;
  const baseHue = isAchromatic ? 0 : baseOklch.h;

  // Find which stop the base color is closest to by lightness
  const baseStopId = findClosestStopId(baseOklch.l, stops);

  const chromaScales = getChromaScales(chromaCurve);
  const lastIndex = stops.length - 1;

  const rampStops: RampStop[] = stops.map((stopDef, index) => {
    // Lightness: always use the stop definition's fixed target
    const lightness = stopDef.lightness;

    // Chroma: scale base chroma by the curve factor
    const chroma = baseChroma * chromaScales[index];

    // Hue: apply shift only when autoHueShift is enabled
    const hueShiftAmount = autoHueShift ? AUTO_HUE_SHIFT_DEGREES : 0;
    const hueOffset = lastIndex > 0
      ? -hueShiftAmount / 2 + (hueShiftAmount * index) / lastIndex
      : 0;
    const hue = isAchromatic ? 0 : baseHue + hueOffset;

    const color = oklchToColor(lightness, chroma, hue);

    return {
      id: stopDef.id,
      color,
      overridden: false,
    };
  });

  return {
    name,
    params,
    stops: rampStops,
    baseStopId,
  };
}

/**
 * Compute the hex color of the base stop in a generated ramp.
 *
 * This shows what the base color would look like after being processed
 * through the ramp algorithm (lightness target + chroma curve). Useful
 * for suggesting a "fit" color to users.
 *
 * @param baseColor - Input color string (hex, oklch, etc.)
 * @param stops - Stop definitions from preset
 * @param chromaCurve - Chroma distribution curve
 * @returns Hex string of the base stop, or null if baseColor is invalid
 */
export function computeBaseStopHex(
  baseColor: string,
  stops: StopDefinition[],
  chromaCurve: ChromaCurve,
): string | null {
  const baseOklch = parseColor(baseColor);
  if (!baseOklch) return null;

  const baseStopId = findClosestStopId(baseOklch.l, stops);
  const stopDef = stops.find(s => s.id === baseStopId);
  if (!stopDef) return null;

  const baseChroma = baseOklch.c;
  const isAchromatic = baseChroma < 0.001;
  const baseHue = isAchromatic ? 0 : baseOklch.h;

  const chromaScales = getChromaScales(chromaCurve);
  const stopIndex = stops.findIndex(s => s.id === baseStopId);
  const chroma = baseChroma * chromaScales[stopIndex];

  const color = oklchToColor(stopDef.lightness, chroma, baseHue);
  return color.hex;
}
