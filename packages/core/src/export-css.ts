/**
 * CSS export — emit three-layer CSS (primitives, semantic, Tailwind mapping).
 *
 * Three-layer pattern:
 *   Layer 1: @theme { --color-{name}-{stop}: oklch(...) }
 *   Layer 2: :root { --token: var(--color-...) } .dark { ... }
 *   Layer 3: @theme inline { --token: var(--token) }
 *
 * All functions are pure: immutable data in, string out.
 */

import { formatOklchCss } from './oklch.js';
import type { Ramp, ResolvedToken, TokenDefinition, TokenSource } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const INDENT = '  ';

/**
 * Format a TokenSource as a CSS value string.
 *
 * - Ramp sources: `var(--color-{ramp}-{stop})`
 * - Literal sources: inline hex value (passed through as-is)
 */
function formatTokenSourceCss(source: TokenSource): string {
  if (source.type === 'ramp') {
    return `var(--color-${source.ramp}-${source.stop})`;
  }
  // Literal: use the raw value (hex, oklch(), etc.)
  return source.value;
}

// ---------------------------------------------------------------------------
// Layer 1: Primitives — @theme { --color-{name}-{stop}: oklch(...) }
// ---------------------------------------------------------------------------

/**
 * Emit Layer 1 CSS: an `@theme` block containing OKLCH primitive variables
 * for every stop of every ramp.
 *
 * Output format:
 * ```css
 * @theme {
 *   --color-blue-50: oklch(99% 0.01 264);
 *   --color-blue-500: oklch(62% 0.15 264);
 *   ...
 * }
 * ```
 *
 * @param ramps - The color ramps to export
 * @returns A CSS string containing the @theme block
 */
export function exportPrimitivesCSS(ramps: Ramp[]): string {
  const lines: string[] = [];

  for (const ramp of ramps) {
    for (const stop of ramp.stops) {
      const { l, c, h } = stop.color.oklch;
      const value = formatOklchCss(l, c, h);
      lines.push(`${INDENT}--color-${ramp.name}-${stop.id}: ${value};`);
    }
  }

  return `@theme {\n${lines.join('\n')}\n}`;
}

// ---------------------------------------------------------------------------
// Layer 2: Semantic — :root { ... } .dark { ... }
// ---------------------------------------------------------------------------

/**
 * Emit Layer 2 CSS: `:root` and `.dark` blocks containing semantic token
 * assignments that reference Layer 1 primitives via `var()`.
 *
 * - Ramp-based tokens use `var(--color-{ramp}-{stop})` references.
 * - Literal tokens use inline CSS color values.
 *
 * Output format:
 * ```css
 * :root {
 *   --primary: var(--color-blue-800);
 *   --background: #ffffff;
 * }
 *
 * .dark {
 *   --primary: var(--color-blue-500);
 *   --background: #000000;
 * }
 * ```
 *
 * @param resolved - The resolved tokens (used for ordering/names)
 * @param tokens - The original token definitions (used for source info)
 * @returns A CSS string containing :root and .dark blocks
 */
export function exportSemanticCSS(
  resolved: ResolvedToken[],
  tokens: TokenDefinition[],
): string {
  const lightLines: string[] = [];
  const darkLines: string[] = [];

  for (const token of tokens) {
    const lightValue = formatTokenSourceCss(token.light);
    const darkValue = formatTokenSourceCss(token.dark);

    lightLines.push(`${INDENT}${token.name}: ${lightValue};`);
    darkLines.push(`${INDENT}${token.name}: ${darkValue};`);
  }

  const rootBlock = `:root {\n${lightLines.join('\n')}\n}`;
  const darkBlock = `.dark {\n${darkLines.join('\n')}\n}`;

  return `${rootBlock}\n\n${darkBlock}`;
}

// ---------------------------------------------------------------------------
// Layer 3: Tailwind mapping — @theme inline { --token: var(--token) }
// ---------------------------------------------------------------------------

/**
 * Emit Layer 3 CSS: an `@theme inline` block that maps semantic tokens
 * to themselves so Tailwind generates utility classes without duplication.
 *
 * Output format:
 * ```css
 * @theme inline {
 *   --primary: var(--primary);
 *   --background: var(--background);
 * }
 * ```
 *
 * @param tokenNames - The semantic token names to map
 * @returns A CSS string containing the @theme inline block
 */
export function exportTailwindMappingCSS(tokenNames: string[]): string {
  const lines: string[] = [];

  for (const name of tokenNames) {
    lines.push(`${INDENT}${name}: var(${name});`);
  }

  return `@theme inline {\n${lines.join('\n')}\n}`;
}
