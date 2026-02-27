/**
 * OKLCH color math — parsing, conversion, gamut mapping.
 *
 * All functions are pure: immutable data in, immutable data out.
 * Uses culori internally for color space conversions.
 */

import { parse, formatHex, converter, clampChroma } from 'culori';
import type { Oklch, Rgb } from 'culori';
import type { OklchColor, Color } from './types.js';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse any CSS color string to an OklchColor.
 * Returns undefined if the input cannot be parsed.
 */
export function parseColor(input: string): OklchColor | undefined {
  const parsed = parse(input);
  if (!parsed) return undefined;

  const oklch = toOklch(parsed);
  if (!oklch) return undefined;

  return {
    l: oklch.l || 0,
    c: oklch.c || 0,
    h: oklch.h ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Full Color conversion
// ---------------------------------------------------------------------------

/**
 * Convert any CSS color string to a full Color object (oklch + hex + rgb).
 * Throws if the input cannot be parsed.
 */
export function toColor(input: string): Color {
  const parsed = parse(input);
  if (!parsed) {
    throw new Error(`Invalid color: ${input}`);
  }

  const oklch = toOklch(parsed);
  const rgb = toRgb(parsed);
  const hex = formatHex(parsed);

  return {
    oklch: {
      l: oklch.l || 0,
      c: oklch.c || 0,
      h: oklch.h ?? 0,
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
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format OKLCH values as a CSS oklch() string.
 * L is expressed as a percentage, C and H as raw numbers.
 * Normalizes -0 to 0 via `|| 0`.
 */
export function formatOklchCss(l: number, c: number, h: number): string {
  const lPct = Math.round(l * 100) || 0;
  const cRound = Math.round(c * 100) / 100 || 0;
  const hRound = Math.round(h) || 0;
  return `oklch(${lPct}% ${cRound} ${hRound})`;
}

/**
 * Convert any CSS color string to a hex string.
 * Throws if the input cannot be parsed.
 */
export function toHex(input: string): string {
  const parsed = parse(input);
  if (!parsed) {
    throw new Error(`Invalid color: ${input}`);
  }
  return formatHex(parsed);
}

// ---------------------------------------------------------------------------
// Gamut mapping
// ---------------------------------------------------------------------------

/**
 * Clamp an OKLCH color to the sRGB gamut by reducing chroma while
 * preserving lightness. Uses culori's clampChroma in the oklch space.
 */
export function clampToSrgb(color: OklchColor): OklchColor {
  const culoriColor: Oklch = {
    mode: 'oklch',
    l: color.l,
    c: color.c,
    h: color.h,
  };

  const clamped = clampChroma(culoriColor, 'oklch');

  return {
    l: clamped.l || 0,
    c: clamped.c || 0,
    h: clamped.h ?? 0,
  };
}

/**
 * Check whether an OKLCH color is within the sRGB gamut.
 *
 * Uses an RGB epsilon check instead of culori's `displayable()` which
 * incorrectly returns false for #ffffff due to float precision
 * (l: 1.0000000000000002).
 */
export function isInGamut(color: OklchColor): boolean {
  const culoriColor: Oklch = {
    mode: 'oklch',
    l: color.l,
    c: color.c,
    h: color.h,
  };

  const rgb = toRgb(culoriColor) as Rgb;
  const epsilon = 1e-6;

  return (
    rgb.r >= -epsilon && rgb.r <= 1 + epsilon &&
    rgb.g >= -epsilon && rgb.g <= 1 + epsilon &&
    rgb.b >= -epsilon && rgb.b <= 1 + epsilon
  );
}

// ---------------------------------------------------------------------------
// Hue utilities
// ---------------------------------------------------------------------------

/**
 * Compute the shortest angular distance between two hues (0-180).
 * Handles wraparound correctly and is symmetric.
 */
export function hueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// ---------------------------------------------------------------------------
// Hue-to-name mapping
// ---------------------------------------------------------------------------

/** OKLCH hue ranges mapped to human-readable color names */
const HUE_NAMES: Array<{ max: number; name: string }> = [
  { max: 20, name: 'pink' },
  { max: 45, name: 'red' },
  { max: 65, name: 'orange' },
  { max: 90, name: 'amber' },
  { max: 115, name: 'yellow' },
  { max: 145, name: 'lime' },
  { max: 175, name: 'green' },
  { max: 200, name: 'emerald' },
  { max: 230, name: 'cyan' },
  { max: 260, name: 'sky' },
  { max: 285, name: 'blue' },
  { max: 310, name: 'indigo' },
  { max: 335, name: 'purple' },
  { max: 360, name: 'pink' },
];

/**
 * Map an OKLCH hue angle + chroma to a human-readable color name.
 * Returns "neutral" for achromatic colors (chroma < 0.01).
 */
export function hueToName(hue: number, chroma: number): string {
  if (chroma < 0.01) return 'neutral';
  const h = ((hue % 360) + 360) % 360;
  for (const { max, name } of HUE_NAMES) {
    if (h < max) return name;
  }
  return 'pink';
}
