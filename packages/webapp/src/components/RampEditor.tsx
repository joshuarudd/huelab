/**
 * RampEditor — the left panel of the three-panel layout.
 *
 * Composes ColorPicker, ParamSliders, and StopStrip to provide
 * a full ramp editing experience. All changes dispatch to the
 * project store, which regenerates the ramp and updates all
 * dependent views.
 */

import { useCallback } from 'react';
import { useProject } from '../store.js';
import { ColorPicker } from './ColorPicker.js';
import { ParamSliders } from './ParamSliders.js';
import { StopStrip } from './StopStrip.js';
import type { RampParams, OklchColor } from '@huelab/core';

export function RampEditor() {
  const { state, dispatch } = useProject();

  const ramp = state.ramps[state.selectedRampIndex];

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

  const handleParamsChange = useCallback(
    (params: RampParams) => {
      dispatch({
        type: 'UPDATE_RAMP_PARAMS',
        index: state.selectedRampIndex,
        params,
      });
    },
    [state.selectedRampIndex, dispatch],
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
      {/* Ramp name */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-200">
          {ramp.name}
        </h2>
        <p className="text-xs text-neutral-500">
          {ramp.stops.length} stops · base at {ramp.baseStopId}
        </p>
      </div>

      {/* Base color picker */}
      <ColorPicker
        value={ramp.params.baseColor}
        onChange={handleBaseColorChange}
        label="Base Color"
      />

      {/* Ramp parameters */}
      <ParamSliders
        params={ramp.params}
        onChange={handleParamsChange}
      />

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
