/**
 * Figma JSON export — emit Figma variable import JSON with alias support.
 *
 * Produces two collections:
 * 1. Primitives — one color variable per ramp stop (RGB 0-1 values)
 * 2. Semantic — light/dark mode tokens that alias primitives or embed literals
 *
 * All functions are pure: immutable data in, immutable data out.
 */

import type {
  Ramp,
  ResolvedToken,
  TokenDefinition,
  TokenSource,
  FigmaExportOptions,
} from './types.js';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** RGB color value with components in 0-1 range */
interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** A reference to another Figma variable by name */
interface FigmaAlias {
  type: 'alias';
  name: string;
}

/** An inline color value */
interface FigmaColorValue {
  type: 'color';
  r: number;
  g: number;
  b: number;
  a: number;
}

/** A primitive variable (single-mode color) */
interface FigmaPrimitiveVariable {
  name: string;
  value: FigmaColor;
  codeSyntax?: { WEB: string };
}

/** A semantic variable (light/dark mode, alias or color) */
interface FigmaSemanticVariable {
  name: string;
  light: FigmaAlias | FigmaColorValue;
  dark: FigmaAlias | FigmaColorValue;
  codeSyntax?: { WEB: string };
}

/** The complete Figma variable export structure */
export interface FigmaVariableExport {
  primitives: {
    collectionName: string;
    variables: FigmaPrimitiveVariable[];
  };
  semantic: {
    collectionName: string;
    variables: FigmaSemanticVariable[];
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build the Figma variable name for a primitive stop.
 * Format: `color/{rampName}/{stopId}`
 */
function primitiveVarName(rampName: string, stopId: number): string {
  return `color/${rampName}/${stopId}`;
}

/**
 * Resolve a TokenSource to either an alias (for ramp-based sources) or
 * an inline color (for literal sources).
 */
function resolveSemanticValue(
  source: TokenSource,
  resolvedColor: { r: number; g: number; b: number },
): FigmaAlias | FigmaColorValue {
  if (source.type === 'ramp') {
    return {
      type: 'alias',
      name: primitiveVarName(source.ramp, source.stop),
    };
  }

  // Literal: emit inline color with RGB 0-1
  return {
    type: 'color',
    r: resolvedColor.r / 255,
    g: resolvedColor.g / 255,
    b: resolvedColor.b / 255,
    a: 1,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export ramps and tokens as Figma-compatible variable JSON.
 *
 * @param ramps - The color ramps to export as primitives
 * @param resolved - Resolved tokens with concrete light/dark Color values
 * @param tokens - Token definitions (needed for source type information)
 * @param options - Export options (collection names, codeSyntax)
 * @returns A FigmaVariableExport with primitives and semantic collections
 */
export function exportFigmaJSON(
  ramps: Ramp[],
  resolved: ResolvedToken[],
  tokens: TokenDefinition[],
  options?: FigmaExportOptions,
): FigmaVariableExport {
  const includeCodeSyntax = options?.includeCodeSyntax ?? false;
  const primitivesCollectionName = options?.primitivesCollectionName ?? 'Primitives';
  const semanticCollectionName = options?.semanticCollectionName ?? 'Semantic';

  // --- Primitives collection ---
  const primitiveVariables: FigmaPrimitiveVariable[] = [];

  for (const ramp of ramps) {
    for (const stop of ramp.stops) {
      const variable: FigmaPrimitiveVariable = {
        name: primitiveVarName(ramp.name, stop.id),
        value: {
          r: stop.color.rgb.r / 255,
          g: stop.color.rgb.g / 255,
          b: stop.color.rgb.b / 255,
          a: 1,
        },
      };

      if (includeCodeSyntax) {
        variable.codeSyntax = { WEB: `--color-${ramp.name}-${stop.id}` };
      }

      primitiveVariables.push(variable);
    }
  }

  // --- Semantic collection ---
  const semanticVariables: FigmaSemanticVariable[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const resolvedToken = resolved[i];

    const variable: FigmaSemanticVariable = {
      name: token.name,
      light: resolveSemanticValue(token.light, resolvedToken.light.rgb),
      dark: resolveSemanticValue(token.dark, resolvedToken.dark.rgb),
    };

    if (includeCodeSyntax) {
      variable.codeSyntax = { WEB: token.name };
    }

    semanticVariables.push(variable);
  }

  return {
    primitives: {
      collectionName: primitivesCollectionName,
      variables: primitiveVariables,
    },
    semantic: {
      collectionName: semanticCollectionName,
      variables: semanticVariables,
    },
  };
}
