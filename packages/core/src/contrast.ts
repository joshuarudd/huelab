/**
 * WCAG 2.2 + APCA contrast calculations.
 *
 * All functions are pure: immutable data in, immutable data out.
 * Uses culori for WCAG contrast ratio and apca-w3 for APCA Lc.
 */

import { wcagContrast, converter } from 'culori';
import type { Oklch } from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import type { OklchColor, ContrastResult, ContrastThresholds } from './types.js';

const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** WCAG 2.2 AA contrast thresholds */
export const AA_THRESHOLDS: ContrastThresholds = {
  normalText: 4.5,
  largeText: 3,
  uiComponent: 3,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert an OklchColor to a culori Oklch object.
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
 * Convert an OklchColor to an RGB tuple [R, G, B] with 0-255 integers.
 * apca-w3's sRGBtoY() expects this format.
 *
 * Gotcha: Math.round() on tiny negatives produces -0. Normalize with || 0.
 */
function toRgb255(color: OklchColor): [number, number, number] {
  const rgb = toRgb(toCuloriOklch(color));
  return [
    Math.round(rgb.r * 255) || 0,
    Math.round(rgb.g * 255) || 0,
    Math.round(rgb.b * 255) || 0,
  ];
}

// ---------------------------------------------------------------------------
// WCAG 2.2 contrast ratio
// ---------------------------------------------------------------------------

/**
 * Compute the WCAG 2.2 contrast ratio between two OKLCH colors.
 *
 * The ratio is symmetric — order of fg/bg does not matter.
 * Returns a value between 1 (identical) and 21 (black vs white).
 */
export function wcagRatio(fg: OklchColor, bg: OklchColor): number {
  return wcagContrast(toCuloriOklch(fg), toCuloriOklch(bg));
}

// ---------------------------------------------------------------------------
// APCA Lc
// ---------------------------------------------------------------------------

/**
 * Compute the APCA Lc (Lightness Contrast) between text and background colors.
 *
 * Returns a signed float:
 * - Positive = dark text on light background
 * - Negative = light text on dark background
 *
 * Use Math.abs() for threshold checks.
 */
export function apcaLc(textColor: OklchColor, bgColor: OklchColor): number {
  const textRgb = toRgb255(textColor);
  const bgRgb = toRgb255(bgColor);

  const textY = sRGBtoY(textRgb);
  const bgY = sRGBtoY(bgRgb);

  const result = APCAcontrast(textY, bgY);

  // APCAcontrast may return a string when places >= 0; we always want a number
  return typeof result === 'string' ? parseFloat(result) : result;
}

// ---------------------------------------------------------------------------
// Combined contrast check
// ---------------------------------------------------------------------------

/**
 * Compute WCAG ratio and APCA Lc, then check against AA thresholds.
 *
 * Returns a ContrastResult with the ratio, Lc, and pass/fail booleans.
 * WCAG AA is the compliance gate; APCA is reported but does not gate.
 */
export function checkContrast(fg: OklchColor, bg: OklchColor): ContrastResult {
  const ratio = wcagRatio(fg, bg);
  const lc = apcaLc(fg, bg);

  return {
    wcagRatio: ratio,
    apcaLc: lc,
    passesAA: {
      normalText: ratio >= AA_THRESHOLDS.normalText,
      largeText: ratio >= AA_THRESHOLDS.largeText,
      uiComponent: ratio >= AA_THRESHOLDS.uiComponent,
    },
  };
}
