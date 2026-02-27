/**
 * AuditPanel — the right panel of the three-panel layout.
 *
 * Displays all fg/bg token pairs from the preset's tokenSchema.pairs,
 * each rendered as a ContrastPair with WCAG ratio, APCA Lc, and
 * pass/fail status for both light and dark modes.
 *
 * A summary bar at the top shows the overall pass count and status.
 */

import { useProject } from '../store.js';
import { ContrastPair } from './ContrastPair.js';

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

function SummaryBar({
  totalPairs,
  lightPasses,
  darkPasses,
  mode,
}: {
  totalPairs: number;
  lightPasses: number;
  darkPasses: number;
  mode: 'light' | 'dark';
}) {
  const activePasses = mode === 'light' ? lightPasses : darkPasses;
  const allPass = activePasses === totalPairs;
  const inactivePasses = mode === 'light' ? darkPasses : lightPasses;
  const inactiveLabel = mode === 'light' ? 'dark' : 'light';

  if (totalPairs === 0) {
    return (
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2">
        <p className="text-sm text-[var(--app-text-muted)]">No contrast pairs defined</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        allPass
          ? 'border-[var(--app-success-border)] bg-[var(--app-success-bg)]'
          : 'border-[var(--app-error-border)] bg-[var(--app-error-bg)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-bold ${
              allPass ? 'text-[var(--app-success)]' : 'text-[var(--app-error)]'
            }`}
          >
            {activePasses}/{totalPairs}
          </span>
          <span className="text-sm text-[var(--app-text-muted)]">
            pass ({mode})
          </span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            allPass
              ? 'bg-[var(--app-success-bg)] text-[var(--app-success-text)]'
              : 'bg-[var(--app-error-bg)] text-[var(--app-error-text)]'
          }`}
        >
          {allPass ? 'ALL PASS' : 'FAILURES'}
        </span>
      </div>

      {/* Inactive mode summary */}
      <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">
        {inactivePasses}/{totalPairs} pass in {inactiveLabel} mode
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuditPanel() {
  const { state, auditReport, resolvedTokens } = useProject();

  const { pairs, summary } = auditReport;
  const hasData = pairs.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--app-text-secondary)]">Contrast Audit</h2>
        <span className="text-[10px] text-[var(--app-text-faint)]">WCAG 2.2 AA</span>
      </div>

      {/* Summary bar */}
      <SummaryBar
        totalPairs={summary.totalPairs}
        lightPasses={summary.lightPasses}
        darkPasses={summary.darkPasses}
        mode={state.mode}
      />

      {/* Pair list */}
      {hasData ? (
        <div className="mt-3 flex flex-col gap-2 overflow-y-auto">
          {pairs.map((result) => (
            <ContrastPair
              key={result.pair.name}
              result={result}
              resolvedTokens={resolvedTokens}
              activeMode={state.mode}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--app-text-muted)]">
            Add ramps to see contrast audit results.
          </p>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">
            The audit checks foreground/background token pairs against WCAG 2.2 AA thresholds.
          </p>
        </div>
      )}
    </div>
  );
}
