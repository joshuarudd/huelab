/**
 * CSS import — parse @theme, :root, .dark blocks into ramp + token structures.
 *
 * This is a text parser, not a full CSS parser. It uses regex to extract
 * custom properties from @theme, :root, and .dark blocks, then groups
 * --color-{name}-{stop} primitives into ramp structures and resolves
 * var() references in semantic tokens.
 */

import type { CSSImportResult } from './types.js';

// ---------------------------------------------------------------------------
// Block extraction
// ---------------------------------------------------------------------------

/**
 * Extract the contents of a CSS block by its selector/at-rule.
 * Returns an array of all matching block bodies (there may be multiples).
 */
function extractBlocks(css: string, selector: RegExp): string[] {
  const blocks: string[] = [];
  // We need to match the selector then find the balanced braces
  let searchFrom = 0;

  while (searchFrom < css.length) {
    // Reset the regex lastIndex for each search
    selector.lastIndex = searchFrom;
    const match = selector.exec(css);
    if (!match) break;

    // Find the opening brace after the match
    const openIdx = css.indexOf('{', match.index + match[0].length - 1);
    if (openIdx === -1) break;

    // Walk forward to find the matching closing brace
    let depth = 0;
    let i = openIdx;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }

    if (depth === 0) {
      blocks.push(css.slice(openIdx + 1, i));
    }

    searchFrom = i + 1;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Property parsing
// ---------------------------------------------------------------------------

/** Parse CSS custom property declarations from a block body. */
function parseProperties(blockBody: string): Record<string, string> {
  const props: Record<string, string> = {};
  // Match lines like: --some-prop: value;
  const propRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = propRegex.exec(blockBody)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    props[name] = value;
  }
  return props;
}

// ---------------------------------------------------------------------------
// Ramp grouping
// ---------------------------------------------------------------------------

/** Pattern for ramp color primitives: --color-{name}-{stop} */
const RAMP_PROP_REGEX = /^--color-([\w-]+?)-(\d+)$/;

interface ParsedRamp {
  name: string;
  stops: Array<{ id: number; value: string }>;
}

/**
 * Group @theme properties matching --color-{name}-{stop} into ramp structures.
 * Non-matching properties are ignored (they're not ramp colors).
 */
function groupIntoRamps(
  props: Record<string, string>,
): ParsedRamp[] {
  const rampMap = new Map<string, Array<{ id: number; value: string }>>();

  for (const [prop, value] of Object.entries(props)) {
    const match = RAMP_PROP_REGEX.exec(prop);
    if (!match) continue;

    const name = match[1];
    const stopId = parseInt(match[2], 10);

    if (!rampMap.has(name)) {
      rampMap.set(name, []);
    }
    rampMap.get(name)!.push({ id: stopId, value });
  }

  // Sort stops by id within each ramp, then sort ramps by name
  const ramps: ParsedRamp[] = [];
  for (const [name, stops] of rampMap.entries()) {
    stops.sort((a, b) => a.id - b.id);
    ramps.push({ name, stops });
  }
  ramps.sort((a, b) => a.name.localeCompare(b.name));

  return ramps;
}

// ---------------------------------------------------------------------------
// var() resolution
// ---------------------------------------------------------------------------

/** Resolve var(--xxx) references against a lookup of known primitives. */
function resolveVarReferences(
  tokens: Record<string, string>,
  primitives: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [name, value] of Object.entries(tokens)) {
    resolved[name] = resolveValue(value, primitives);
  }

  return resolved;
}

/** Resolve a single value, replacing var() calls with their primitive values. */
function resolveValue(
  value: string,
  primitives: Record<string, string>,
): string {
  // Match var(--xxx) or var(--xxx, fallback)
  const varRegex = /var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g;

  return value.replace(varRegex, (_match, varName: string, fallback?: string) => {
    if (primitives[varName] !== undefined) {
      return primitives[varName];
    }
    if (fallback !== undefined) {
      return fallback.trim();
    }
    // If unresolvable, keep the original var() expression
    return _match;
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parse a CSS string containing @theme, :root, and .dark blocks into
 * ramp and token structures.
 *
 * Expects the three-layer CSS format used by huelab:
 * - `@theme { ... }` — primitive color variables (--color-{name}-{stop}: value)
 * - `:root { ... }` — light-mode semantic tokens
 * - `.dark { ... }` — dark-mode semantic tokens
 *
 * @param css - Raw CSS string to parse
 * @returns Parsed ramps and token maps for light/dark modes
 */
export function importCSS(css: string): CSSImportResult {
  // 1. Extract @theme blocks and parse primitives
  const themeBlocks = extractBlocks(css, /@theme\s*\{/g);
  const primitives: Record<string, string> = {};
  for (const block of themeBlocks) {
    Object.assign(primitives, parseProperties(block));
  }

  // 2. Group primitives into ramp structures
  const ramps = groupIntoRamps(primitives);

  // 3. Extract :root blocks and parse light tokens
  const rootBlocks = extractBlocks(css, /:root\s*\{/g);
  const lightTokensRaw: Record<string, string> = {};
  for (const block of rootBlocks) {
    Object.assign(lightTokensRaw, parseProperties(block));
  }

  // 4. Extract .dark blocks and parse dark tokens
  const darkBlocks = extractBlocks(css, /\.dark\s*\{/g);
  const darkTokensRaw: Record<string, string> = {};
  for (const block of darkBlocks) {
    Object.assign(darkTokensRaw, parseProperties(block));
  }

  // 5. Resolve var() references against primitives
  const lightTokens = resolveVarReferences(lightTokensRaw, primitives);
  const darkTokens = resolveVarReferences(darkTokensRaw, primitives);

  return {
    ramps,
    tokens: {
      light: lightTokens,
      dark: darkTokens,
    },
  };
}
