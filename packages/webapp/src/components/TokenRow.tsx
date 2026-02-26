/**
 * TokenRow — a single row in the Token Map panel.
 *
 * Displays a semantic token's name, light + dark mode swatches, the resolved
 * source label, and a dropdown to reassign the token source. Changes dispatch
 * SET_TOKEN_SOURCE to the project store.
 */

import { useState } from 'react';
import type { TokenSource, ResolvedToken, Ramp } from '@huelab/core';

// -------------------------------------------------------------------------
// Props
// -------------------------------------------------------------------------

export interface TokenRowProps {
  /** Token name, e.g. "--primary" */
  tokenName: string;
  /** Optional description from the preset */
  description?: string;
  /** Resolved token data (may be undefined if ramps are not loaded) */
  resolved?: ResolvedToken;
  /** Current light-mode source from tokenMapping */
  lightSource?: TokenSource;
  /** Current dark-mode source from tokenMapping */
  darkSource?: TokenSource;
  /** All available ramps for the dropdown */
  ramps: Ramp[];
  /** Callback when a source is changed */
  onSourceChange: (tokenName: string, mode: 'light' | 'dark', source: TokenSource) => void;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Format a TokenSource into a readable label */
function formatSource(source?: TokenSource): string {
  if (!source) return 'unset';
  if (source.type === 'ramp') return `${source.ramp}-${source.stop}`;
  return source.value;
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function TokenRow({
  tokenName,
  description,
  resolved,
  lightSource,
  darkSource,
  ramps,
  onSourceChange,
}: TokenRowProps) {
  const [editingMode, setEditingMode] = useState<'light' | 'dark' | null>(null);
  const [literalValue, setLiteralValue] = useState('');

  const lightHex = resolved?.light.hex ?? 'transparent';
  const darkHex = resolved?.dark.hex ?? 'transparent';
  const lightLabel = resolved?.lightSource ?? formatSource(lightSource);
  const darkLabel = resolved?.darkSource ?? formatSource(darkSource);

  // Build ramp-stop options for the dropdown
  const rampStopOptions: Array<{ label: string; ramp: string; stop: number }> = [];
  for (const ramp of ramps) {
    for (const stop of ramp.stops) {
      rampStopOptions.push({
        label: `${ramp.name}-${stop.id}`,
        ramp: ramp.name,
        stop: stop.id,
      });
    }
  }

  function handleDropdownChange(mode: 'light' | 'dark', value: string) {
    if (value === '__literal__') {
      setEditingMode(mode);
      setLiteralValue('');
      return;
    }
    setEditingMode(null);
    // Parse "rampName-stopId"
    const lastDash = value.lastIndexOf('-');
    if (lastDash === -1) return;
    const rampName = value.substring(0, lastDash);
    const stopId = parseInt(value.substring(lastDash + 1), 10);
    if (isNaN(stopId)) return;
    onSourceChange(tokenName, mode, { type: 'ramp', ramp: rampName, stop: stopId });
  }

  function handleLiteralSubmit(mode: 'light' | 'dark') {
    if (literalValue.trim()) {
      onSourceChange(tokenName, mode, { type: 'literal', value: literalValue.trim() });
    }
    setEditingMode(null);
    setLiteralValue('');
  }

  function currentDropdownValue(source?: TokenSource): string {
    if (!source) return '';
    if (source.type === 'ramp') return `${source.ramp}-${source.stop}`;
    return '__literal__';
  }

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-800/50">
      {/* Token name & description tooltip */}
      <div className="relative w-48 shrink-0">
        <span className="text-sm font-mono text-neutral-200 truncate block">{tokenName}</span>
        {description && (
          <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden rounded bg-neutral-700 px-2 py-1 text-[11px] text-neutral-300 shadow-lg group-hover:block whitespace-nowrap">
            {description}
          </div>
        )}
      </div>

      {/* Light mode swatch + source */}
      <div className="flex items-center gap-1.5">
        <div
          className="h-6 w-6 rounded border border-neutral-600 shrink-0"
          style={{ backgroundColor: lightHex }}
          title={`Light: ${lightHex}`}
        />
        <span className="text-xs text-neutral-400 w-24 truncate" title={lightLabel}>
          {lightLabel}
        </span>
      </div>

      {/* Dark mode swatch + source */}
      <div className="flex items-center gap-1.5">
        <div
          className="h-6 w-6 rounded border border-neutral-600 shrink-0"
          style={{ backgroundColor: darkHex }}
          title={`Dark: ${darkHex}`}
        />
        <span className="text-xs text-neutral-400 w-24 truncate" title={darkLabel}>
          {darkLabel}
        </span>
      </div>

      {/* Light source dropdown */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] uppercase tracking-wider text-neutral-500">L</label>
        {editingMode === 'light' ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              className="w-24 rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
              placeholder="#hex or oklch()"
              value={literalValue}
              onChange={e => setLiteralValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleLiteralSubmit('light');
                if (e.key === 'Escape') setEditingMode(null);
              }}
              autoFocus
            />
            <button
              className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-600"
              onClick={() => handleLiteralSubmit('light')}
            >
              OK
            </button>
          </div>
        ) : (
          <select
            className="w-32 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-xs text-neutral-300 focus:border-blue-500 focus:outline-none"
            value={currentDropdownValue(lightSource)}
            onChange={e => handleDropdownChange('light', e.target.value)}
          >
            <option value="" disabled>
              Select...
            </option>
            {rampStopOptions.map(opt => (
              <option key={`light-${opt.label}`} value={opt.label}>
                {opt.label}
              </option>
            ))}
            <option value="__literal__">Literal...</option>
          </select>
        )}
      </div>

      {/* Dark source dropdown */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] uppercase tracking-wider text-neutral-500">D</label>
        {editingMode === 'dark' ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              className="w-24 rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
              placeholder="#hex or oklch()"
              value={literalValue}
              onChange={e => setLiteralValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleLiteralSubmit('dark');
                if (e.key === 'Escape') setEditingMode(null);
              }}
              autoFocus
            />
            <button
              className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-600"
              onClick={() => handleLiteralSubmit('dark')}
            >
              OK
            </button>
          </div>
        ) : (
          <select
            className="w-32 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-xs text-neutral-300 focus:border-blue-500 focus:outline-none"
            value={currentDropdownValue(darkSource)}
            onChange={e => handleDropdownChange('dark', e.target.value)}
          >
            <option value="" disabled>
              Select...
            </option>
            {rampStopOptions.map(opt => (
              <option key={`dark-${opt.label}`} value={opt.label}>
                {opt.label}
              </option>
            ))}
            <option value="__literal__">Literal...</option>
          </select>
        )}
      </div>
    </div>
  );
}
