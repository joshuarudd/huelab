/**
 * ContrastPair — displays a single foreground/background token pair
 * with contrast results for both light and dark modes.
 *
 * Shows:
 * - Pair name
 * - Foreground swatch over background swatch (visual preview)
 * - WCAG ratio (e.g., "9.09:1")
 * - APCA Lc (e.g., "Lc 78.2")
 * - Pass/fail badge
 * - Light and dark mode results side by side
 */

import type { AuditPairResult, ResolvedToken } from '@huelab/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContrastPairProps {
  result: AuditPairResult;
  resolvedTokens: ResolvedToken[];
  activeMode: 'light' | 'dark';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a WCAG contrast ratio to a readable string (e.g., "9.09:1").
 */
function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Format an APCA Lc value (e.g., "Lc 78.2").
 * Uses the absolute value since the sign only indicates polarity.
 */
function formatLc(lc: number): string {
  return `Lc ${Math.abs(lc).toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * A single mode's contrast result display.
 */
function ModeResult({
  passes,
  wcagRatio,
  apcaLc,
  fgHex,
  bgHex,
  modeLabel,
  isActive,
}: {
  passes: boolean;
  wcagRatio: number;
  apcaLc: number;
  fgHex: string;
  bgHex: string;
  modeLabel: string;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1.5 ${
        isActive ? 'bg-neutral-800' : 'bg-neutral-900/50 opacity-60'
      }`}
    >
      {/* Mode label */}
      <span className="w-10 shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {modeLabel}
      </span>

      {/* Swatch preview: foreground text on background */}
      <div
        className="flex h-6 w-10 shrink-0 items-center justify-center rounded text-[10px] font-bold"
        style={{ backgroundColor: bgHex, color: fgHex }}
        title={`fg: ${fgHex} / bg: ${bgHex}`}
      >
        Aa
      </div>

      {/* WCAG ratio */}
      <span className="min-w-[52px] text-xs font-mono text-neutral-300">
        {formatRatio(wcagRatio)}
      </span>

      {/* APCA Lc */}
      <span className="min-w-[48px] text-[10px] font-mono text-neutral-500">
        {formatLc(apcaLc)}
      </span>

      {/* Pass/fail badge */}
      <span
        className={`ml-auto shrink-0 text-xs font-semibold ${
          passes ? 'text-green-400' : 'text-red-400'
        }`}
        aria-label={passes ? 'Pass' : 'Fail'}
      >
        {passes ? 'PASS' : 'FAIL'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ContrastPair({ result, resolvedTokens, activeMode }: ContrastPairProps) {
  const { pair, light, dark, lightPasses, darkPasses } = result;

  // Find the resolved tokens for fg and bg to get hex values
  const fgToken = resolvedTokens.find((t) => t.name === pair.foreground);
  const bgToken = resolvedTokens.find((t) => t.name === pair.background);

  // Fallback hex values if tokens are not resolved
  const lightFgHex = fgToken?.light.hex ?? '#888888';
  const lightBgHex = bgToken?.light.hex ?? '#ffffff';
  const darkFgHex = fgToken?.dark.hex ?? '#888888';
  const darkBgHex = bgToken?.dark.hex ?? '#000000';

  // Both modes fail?
  const anyFailure = !lightPasses || !darkPasses;

  return (
    <div
      className={`rounded-lg border p-3 ${
        anyFailure
          ? 'border-red-900/50 bg-red-950/20'
          : 'border-neutral-800 bg-neutral-900/30'
      }`}
    >
      {/* Pair header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-200">{pair.name}</h3>
        <span className="text-[10px] text-neutral-600">
          {pair.threshold === 'normalText'
            ? '4.5:1'
            : '3:1'}
        </span>
      </div>

      {/* Mode results — active mode first */}
      <div className="flex flex-col gap-1">
        {activeMode === 'light' ? (
          <>
            <ModeResult
              passes={lightPasses}
              wcagRatio={light.wcagRatio}
              apcaLc={light.apcaLc}
              fgHex={lightFgHex}
              bgHex={lightBgHex}
              modeLabel="Light"
              isActive={true}
            />
            <ModeResult
              passes={darkPasses}
              wcagRatio={dark.wcagRatio}
              apcaLc={dark.apcaLc}
              fgHex={darkFgHex}
              bgHex={darkBgHex}
              modeLabel="Dark"
              isActive={false}
            />
          </>
        ) : (
          <>
            <ModeResult
              passes={darkPasses}
              wcagRatio={dark.wcagRatio}
              apcaLc={dark.apcaLc}
              fgHex={darkFgHex}
              bgHex={darkBgHex}
              modeLabel="Dark"
              isActive={true}
            />
            <ModeResult
              passes={lightPasses}
              wcagRatio={light.wcagRatio}
              apcaLc={light.apcaLc}
              fgHex={lightFgHex}
              bgHex={lightBgHex}
              modeLabel="Light"
              isActive={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
