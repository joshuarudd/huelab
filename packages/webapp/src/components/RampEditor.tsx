/**
 * RampEditor — the left panel of the three-panel layout.
 *
 * Composes ColorPicker, ParamSliders, and StopStrip to provide
 * a full ramp editing experience. All changes dispatch to the
 * project store, which regenerates the ramp and updates all
 * dependent views.
 */

import { useCallback, useMemo, useState } from 'react';
import { useProject } from '../store.js';
import { ColorPicker } from './ColorPicker.js';
import { StopStrip } from './StopStrip.js';
import { hueToName, parseColor, computeBaseStopHex, getStops, type OklchColor } from '@huelab/core';

export function RampEditor() {
  const { state, dispatch } = useProject();

  const ramp = state.ramps[state.selectedRampIndex];
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleBaseColorChange = useCallback(
    (hex: string) => {
      if (!ramp) return;
      dispatch({
        type: 'UPDATE_RAMP_PARAMS',
        index: state.selectedRampIndex,
        params: { ...ramp.params, baseColor: hex },
      });
    },
    [ramp, state.selectedRampIndex, dispatch],
  );

  const handleOverride = useCallback(
    (stopId: number, overrides: Partial<OklchColor>) => {
      dispatch({
        type: 'OVERRIDE_STOP',
        rampIndex: state.selectedRampIndex,
        stopId,
        overrides,
      });
    },
    [state.selectedRampIndex, dispatch],
  );

  const handleClearOverride = useCallback(
    (stopId: number) => {
      dispatch({
        type: 'CLEAR_OVERRIDE',
        rampIndex: state.selectedRampIndex,
        stopId,
      });
    },
    [state.selectedRampIndex, dispatch],
  );

  const handleRenameCommit = useCallback(() => {
    if (!ramp) { setEditingName(false); return; }
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== ramp.name) {
      dispatch({
        type: 'RENAME_RAMP',
        index: state.selectedRampIndex,
        name: trimmed,
      });
    }
    setEditingName(false);
  }, [nameValue, ramp, state.selectedRampIndex, dispatch]);

  // Compute suggested name from current base color's hue
  const suggestedName = useMemo(() => {
    if (!ramp) return null;
    const parsed = parseColor(ramp.params.baseColor);
    if (!parsed) return null;
    const baseName = hueToName(parsed.h, parsed.c);
    // Strip any numeric suffix from current name for comparison (e.g. "blue-2" → "blue")
    const currentBase = ramp.name.replace(/-\d+$/, '');
    if (baseName === currentBase) return null;
    // Deduplicate: if "orange" exists, suggest "orange-2", etc.
    const existingNames = new Set(state.ramps.map(r => r.name));
    let name = baseName;
    let suffix = 2;
    while (existingNames.has(name) && name !== ramp.name) {
      name = `${baseName}-${suffix}`;
      suffix++;
    }
    return name;
  }, [ramp, state.ramps]);

  const handleAcceptSuggestion = useCallback(() => {
    if (!suggestedName || !ramp) return;
    dispatch({
      type: 'RENAME_RAMP',
      index: state.selectedRampIndex,
      name: suggestedName,
    });
  }, [suggestedName, ramp, state.selectedRampIndex, dispatch]);

  // Suggested base color: show the hex that the base stop actually resolves to
  const suggestedBaseHex = useMemo(() => {
    if (!ramp) return null;
    const stops = getStops(state.preset);
    const computed = computeBaseStopHex(
      ramp.params.baseColor,
      stops,
      state.systemSettings.chromaCurve,
    );
    if (!computed || computed === ramp.params.baseColor) return null;
    return computed;
  }, [ramp, state.preset, state.systemSettings.chromaCurve]);

  const handleAcceptBaseColor = useCallback(() => {
    if (!suggestedBaseHex || !ramp) return;
    dispatch({
      type: 'UPDATE_RAMP_PARAMS',
      index: state.selectedRampIndex,
      params: { baseColor: suggestedBaseHex },
    });
  }, [suggestedBaseHex, ramp, state.selectedRampIndex, dispatch]);

  // -------------------------------------------------------------------------
  // Empty state: no ramps loaded yet
  // -------------------------------------------------------------------------

  if (!ramp) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-sm text-neutral-500">
          No ramp selected. Add a ramp to get started.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto">
      {/* Ramp name (click to edit) */}
      <div>
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameCommit();
              if (e.key === 'Escape') setEditingName(false);
            }}
            className="w-full rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-sm font-semibold text-neutral-200 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        ) : (
          <h2
            className="cursor-pointer text-sm font-semibold text-neutral-200 hover:text-white"
            onClick={() => {
              setNameValue(ramp.name);
              setEditingName(true);
            }}
            title="Click to rename"
          >
            {ramp.name}
          </h2>
        )}
        {suggestedName && !editingName && (
          <button
            type="button"
            onClick={handleAcceptSuggestion}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Rename to &ldquo;{suggestedName}&rdquo;?
          </button>
        )}
        <p className="text-xs text-neutral-500">
          {ramp.stops.length} stops &middot; base at {ramp.baseStopId}
        </p>
      </div>

      {/* Base color picker */}
      <ColorPicker
        value={ramp.params.baseColor}
        onChange={handleBaseColorChange}
        label="Base Color"
      />
      {suggestedBaseHex && (
        <p className="text-xs text-neutral-400">
          Maps to stop {ramp.baseStopId} as{' '}
          <span className="font-mono text-neutral-300">{suggestedBaseHex}</span>
          {' \u2014 '}
          <button
            type="button"
            onClick={handleAcceptBaseColor}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Use {suggestedBaseHex}
          </button>
        </p>
      )}

      {/* Divider */}
      <hr className="border-neutral-800" />

      {/* Stop strip with overrides */}
      <StopStrip
        ramp={ramp}
        onOverride={handleOverride}
        onClearOverride={handleClearOverride}
      />
    </div>
  );
}
