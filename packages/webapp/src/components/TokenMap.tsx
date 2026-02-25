/**
 * TokenMap — center panel of the huelab webapp.
 *
 * Lists all semantic tokens from the active preset, grouped by category.
 * Each token shows light/dark swatches, source labels, and a dropdown for
 * reassignment. A light/dark mode toggle dispatches TOGGLE_MODE.
 */

import { useMemo } from 'react';
import { useProject } from '../store.js';
import { TokenRow } from './TokenRow.js';
import type { TokenSource } from '@huelab/core';

// -------------------------------------------------------------------------
// Category grouping
// -------------------------------------------------------------------------

interface TokenGroup {
  label: string;
  tokenNames: string[];
}

/**
 * Classify a token name into a category key for grouping.
 *
 * Order matters: more specific patterns must come before general ones.
 */
function classifyToken(name: string): string {
  // Strip leading -- for matching
  const n = name.replace(/^--/, '');

  // Sidebar tokens
  if (n.startsWith('sidebar-')) return 'sidebar';

  // Chart tokens
  if (n.startsWith('chart-')) return 'charts';

  // Brand tokens
  if (n.startsWith('brand-')) return 'brand';

  // Table tokens
  if (n.startsWith('table-')) return 'table';

  // Subtle status tokens (must come before status check)
  if (n.includes('-subtle')) return 'subtle';

  // Status tokens
  if (
    n.startsWith('destructive') ||
    n.startsWith('info') ||
    n.startsWith('warning') ||
    n.startsWith('success')
  ) {
    return 'status';
  }

  // Borders & inputs
  if (n === 'border' || n === 'input' || n === 'ring') return 'borders';

  // Core tokens: background, foreground, card*, popover*, primary*, secondary*, muted*, accent*
  return 'core';
}

/** Labels for each category group */
const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  status: 'Status',
  subtle: 'Subtle',
  borders: 'Borders & Inputs',
  charts: 'Charts',
  sidebar: 'Sidebar',
  brand: 'Brand',
  table: 'Table',
};

/** Desired display order for categories */
const CATEGORY_ORDER: string[] = [
  'core',
  'status',
  'subtle',
  'borders',
  'charts',
  'sidebar',
  'brand',
  'table',
];

/**
 * Group token names by category, maintaining definition order within each group.
 */
function groupTokens(tokenNames: string[]): TokenGroup[] {
  const groups: Record<string, string[]> = {};

  for (const name of tokenNames) {
    const category = classifyToken(name);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(name);
  }

  return CATEGORY_ORDER
    .filter(key => groups[key]?.length)
    .map(key => ({
      label: CATEGORY_LABELS[key] ?? key,
      tokenNames: groups[key],
    }));
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function TokenMap() {
  const { state, dispatch, resolvedTokens } = useProject();
  const { preset, tokenMapping, ramps, mode } = state;

  // Build token name list from the preset schema
  const tokenNames = useMemo(
    () => preset.tokenSchema.tokens.map(t => t.name),
    [preset],
  );

  // Group tokens by category
  const groups = useMemo(() => groupTokens(tokenNames), [tokenNames]);

  // Index resolved tokens by name for O(1) lookup
  const resolvedByName = useMemo(() => {
    const map = new Map<string, (typeof resolvedTokens)[number]>();
    for (const rt of resolvedTokens) {
      map.set(rt.name, rt);
    }
    return map;
  }, [resolvedTokens]);

  // Index token mapping by name for O(1) lookup
  const mappingByName = useMemo(() => {
    const map = new Map<string, { light: TokenSource; dark: TokenSource }>();
    for (const td of tokenMapping) {
      map.set(td.name, { light: td.light, dark: td.dark });
    }
    return map;
  }, [tokenMapping]);

  // Description lookup from preset
  const descriptionByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of preset.tokenSchema.tokens) {
      if (t.description) map.set(t.name, t.description);
    }
    return map;
  }, [preset]);

  function handleSourceChange(tokenName: string, m: 'light' | 'dark', source: TokenSource) {
    dispatch({ type: 'SET_TOKEN_SOURCE', tokenName, mode: m, source });
  }

  function handleToggleMode() {
    dispatch({ type: 'TOGGLE_MODE' });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
          Token Map
        </h2>
        <button
          onClick={handleToggleMode}
          className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
          title={`Current mode: ${mode}. Click to toggle.`}
        >
          {mode === 'light' ? (
            <>
              <SunIcon />
              <span>Light</span>
            </>
          ) : (
            <>
              <MoonIcon />
              <span>Dark</span>
            </>
          )}
        </button>
      </div>

      {/* Token list (scrollable) */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {ramps.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-neutral-500">No ramps loaded.</p>
            <p className="text-xs text-neutral-600 mt-1">
              Add ramps in the Ramp Editor to assign token sources.
            </p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.label} className="mb-4">
            <h3 className="sticky top-0 z-10 bg-neutral-950 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-500 border-b border-neutral-800/50">
              {group.label}
            </h3>
            <div className="mt-1">
              {group.tokenNames.map(name => {
                const mapping = mappingByName.get(name);
                return (
                  <TokenRow
                    key={name}
                    tokenName={name}
                    description={descriptionByName.get(name)}
                    resolved={resolvedByName.get(name)}
                    lightSource={mapping?.light}
                    darkSource={mapping?.dark}
                    ramps={ramps}
                    onSourceChange={handleSourceChange}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer summary */}
      <div className="border-t border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-500">
        {tokenNames.length} tokens &middot; {ramps.length} ramp{ramps.length !== 1 ? 's' : ''} loaded
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Icons (inline SVG to avoid external dependencies)
// -------------------------------------------------------------------------

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
