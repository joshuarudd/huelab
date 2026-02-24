/**
 * Accessibility audit — check fg/bg token pairs against WCAG thresholds.
 *
 * Evaluates resolved tokens in both light and dark modes against
 * WCAG 2.2 AA thresholds. APCA Lc is computed alongside but does not
 * gate pass/fail.
 *
 * All functions are pure: immutable data in, immutable data out.
 */

import { checkContrast, AA_THRESHOLDS } from './contrast.js';
import type {
  ResolvedToken,
  TokenPairDefinition,
  AuditPairResult,
  AuditReport,
  ContrastResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether a contrast result passes the given threshold type.
 */
function passesThreshold(
  result: ContrastResult,
  threshold: TokenPairDefinition['threshold'],
): boolean {
  return result.wcagRatio >= AA_THRESHOLDS[threshold];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Audit an array of foreground/background token pairs for WCAG 2.2 AA compliance.
 *
 * For each pair:
 * 1. Look up the foreground and background resolved tokens by name
 * 2. Check contrast in both light and dark modes
 * 3. Determine pass/fail based on the pair's threshold type
 *
 * Returns an AuditReport with per-pair results and a summary.
 *
 * @param resolved - The resolved tokens (from resolveTokens)
 * @param pairs - The fg/bg pairs to check
 * @returns An AuditReport with results and summary
 * @throws If a referenced token name doesn't exist in resolved tokens
 */
export function auditTokenPairs(
  resolved: ResolvedToken[],
  pairs: TokenPairDefinition[],
): AuditReport {
  const tokenMap = new Map<string, ResolvedToken>();
  for (const token of resolved) {
    tokenMap.set(token.name, token);
  }

  const pairResults: AuditPairResult[] = pairs.map((pair) => {
    const fg = tokenMap.get(pair.foreground);
    if (!fg) {
      throw new Error(
        `Foreground token "${pair.foreground}" not found in resolved tokens`,
      );
    }

    const bg = tokenMap.get(pair.background);
    if (!bg) {
      throw new Error(
        `Background token "${pair.background}" not found in resolved tokens`,
      );
    }

    // Check contrast in light mode
    const lightContrast = checkContrast(fg.light.oklch, bg.light.oklch);
    const lightPasses = passesThreshold(lightContrast, pair.threshold);

    // Check contrast in dark mode
    const darkContrast = checkContrast(fg.dark.oklch, bg.dark.oklch);
    const darkPasses = passesThreshold(darkContrast, pair.threshold);

    return {
      pair,
      light: lightContrast,
      dark: darkContrast,
      lightPasses,
      darkPasses,
    };
  });

  // Compute summary
  const totalPairs = pairResults.length;
  const lightPasses = pairResults.filter((r) => r.lightPasses).length;
  const darkPasses = pairResults.filter((r) => r.darkPasses).length;
  const failures = pairResults.filter((r) => !r.lightPasses || !r.darkPasses);

  return {
    pairs: pairResults,
    summary: {
      totalPairs,
      lightPasses,
      darkPasses,
      failures,
    },
  };
}
