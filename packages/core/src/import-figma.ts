/**
 * Figma JSON import — parse W3C Design Tokens JSON into ramp + token structures.
 *
 * Figma exports variables in the W3C Design Tokens format. This module parses:
 * - Primitives: "color/{ramp-name}/{stop}" with sRGB 0-1 components
 * - Semantic tokens (light/dark): token names with optional alias data pointing to primitives
 *
 * All color math uses culori for sRGB → OKLCH conversion.
 */

import { oklch } from 'culori';
import type { Ramp, RampStop, Color, OklchColor, FigmaImportResult } from './types.js';

// ---------------------------------------------------------------------------
// Internal types for the W3C Design Tokens JSON format
// ---------------------------------------------------------------------------

interface FigmaColorValue {
  colorSpace: string;
  components: [number, number, number];
  alpha: number;
  hex?: string;
}

interface FigmaTokenEntry {
  $type: string;
  $value: FigmaColorValue | unknown;
  $extensions?: {
    'com.figma.aliasData'?: {
      targetVariableName: string;
      targetVariableSetName: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface FigmaImportInput {
  primitives?: Record<string, unknown>;
  light: Record<string, unknown>;
  dark: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert sRGB 0-1 components to a hex string.
 */
function srgbToHex(r: number, g: number, b: number): string {
  const toInt = (v: number): number => Math.round(v * 255) || 0;
  const rr = toInt(r).toString(16).padStart(2, '0');
  const gg = toInt(g).toString(16).padStart(2, '0');
  const bb = toInt(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

/**
 * Convert sRGB 0-1 components to a full Color object (hex + RGB 0-255 + OKLCH).
 */
function srgbToColor(r: number, g: number, b: number): Color {
  const hex = srgbToHex(r, g, b);

  // RGB 0-255
  const rgbValues = {
    r: Math.round(r * 255) || 0,
    g: Math.round(g * 255) || 0,
    b: Math.round(b * 255) || 0,
  };

  // Convert to OKLCH via culori
  const oklchResult = oklch({ mode: 'rgb', r, g, b });
  const oklchColor: OklchColor = {
    l: oklchResult?.l ?? 0,
    c: oklchResult?.c ?? 0,
    h: oklchResult?.h ?? 0,
  };

  return { oklch: oklchColor, hex, rgb: rgbValues };
}

/**
 * Check if a token entry is a color type with valid sRGB components.
 */
function isColorEntry(entry: unknown): entry is FigmaTokenEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  if (e.$type !== 'color') return false;
  if (typeof e.$value !== 'object' || e.$value === null) return false;
  const val = e.$value as Record<string, unknown>;
  return Array.isArray(val.components) && val.components.length === 3;
}

/**
 * Parse a primitive key like "color/blue/500" into { group, stopKey }.
 * Returns null if the key doesn't match the "color/{group}/{stop}" pattern.
 */
function parsePrimitiveKey(key: string): { group: string; stopKey: string } | null {
  const parts = key.split('/');
  if (parts.length < 3 || parts[0] !== 'color') return null;
  // Support nested groups: "color/base/white" → group="base", stopKey="white"
  const group = parts.slice(1, -1).join('-');
  const stopKey = parts[parts.length - 1];
  return { group, stopKey };
}

/**
 * Convert an alias target variable name to a token reference string.
 * e.g., "color/blue/500" → "blue-500"
 *        "color/base/white" → "base-white"
 */
function aliasToReference(targetVariableName: string): string {
  const stripped = targetVariableName.replace(/^color\//, '');
  return stripped.replace(/\//g, '-');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parse W3C Design Tokens JSON (as exported by Figma) into ramp and token structures.
 *
 * @param input.primitives - Primitives collection with "color/{name}/{stop}" keys
 * @param input.light - Light mode semantic tokens
 * @param input.dark - Dark mode semantic tokens
 * @returns FigmaImportResult with ramps and tokens
 */
export function importFigmaJSON(input: FigmaImportInput): FigmaImportResult {
  const ramps = parsePrimitives(input.primitives ?? {});
  const lightTokens = parseSemanticTokens(input.light);
  const darkTokens = parseSemanticTokens(input.dark);

  return {
    ramps,
    tokens: {
      light: lightTokens,
      dark: darkTokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Primitives parsing
// ---------------------------------------------------------------------------

/**
 * Parse the primitives collection into an array of Ramp objects.
 * Groups entries by ramp name, sorts stops by numeric ID.
 */
function parsePrimitives(primitives: Record<string, unknown>): Ramp[] {
  // Group entries by ramp name
  const groups = new Map<string, Array<{ stopKey: string; entry: FigmaTokenEntry }>>();

  for (const [key, value] of Object.entries(primitives)) {
    if (!isColorEntry(value)) continue;

    const parsed = parsePrimitiveKey(key);
    if (!parsed) continue;

    const { group, stopKey } = parsed;
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push({ stopKey, entry: value });
  }

  // Convert each group into a Ramp
  const ramps: Ramp[] = [];

  for (const [name, entries] of groups) {
    const stops: RampStop[] = entries.map(({ stopKey, entry }) => {
      const val = entry.$value as FigmaColorValue;
      const [r, g, b] = val.components;
      const color = srgbToColor(r, g, b);

      // Parse numeric stop ID; default to 0 for non-numeric names
      const numericId = parseInt(stopKey, 10);
      const id = Number.isNaN(numericId) ? 0 : numericId;

      return {
        id,
        color,
        overridden: false,
      };
    });

    // Sort stops by numeric ID
    stops.sort((a, b) => a.id - b.id);

    // Find the middle stop to use as the base color for params
    const middleStop = stops[Math.floor(stops.length / 2)];
    const baseHex = middleStop?.color.hex ?? '#000000';

    // Determine a reasonable baseStopId — use the middle stop's ID
    const baseStopId = middleStop?.id ?? 500;

    ramps.push({
      name,
      params: {
        baseColor: baseHex,
      },
      stops,
      baseStopId,
    });
  }

  // Sort ramps alphabetically by name
  ramps.sort((a, b) => a.name.localeCompare(b.name));

  return ramps;
}

// ---------------------------------------------------------------------------
// Semantic token parsing
// ---------------------------------------------------------------------------

/**
 * Parse a semantic token collection (light or dark) into a record of
 * token name → reference string (or hex fallback).
 */
function parseSemanticTokens(tokens: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    if (!isColorEntry(value)) continue;

    const entry = value as FigmaTokenEntry;
    const tokenName = `--${key}`;

    // Check for alias data
    const aliasData = entry.$extensions?.['com.figma.aliasData'];
    if (aliasData?.targetVariableName) {
      result[tokenName] = aliasToReference(aliasData.targetVariableName);
    } else {
      // Fall back to hex from $value
      const val = entry.$value as FigmaColorValue;
      if (val.hex) {
        result[tokenName] = val.hex;
      } else {
        const [r, g, b] = val.components;
        result[tokenName] = srgbToHex(r, g, b);
      }
    }
  }

  return result;
}
