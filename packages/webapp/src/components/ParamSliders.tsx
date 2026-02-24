/**
 * ParamSliders — controls for ramp generation parameters.
 *
 * Provides:
 * - Chroma curve selector (natural/linear/flat dropdown)
 * - Hue shift slider (0-30)
 * - Base lightness slider (0-1)
 *
 * All changes call the onChange callback with updated RampParams.
 */

import { useCallback } from 'react';
import type { RampParams } from '@huelab/core';

interface ParamSlidersProps {
  params: RampParams;
  onChange: (params: RampParams) => void;
}

const CHROMA_CURVES: Array<{ value: RampParams['chromaCurve']; label: string }> = [
  { value: 'natural', label: 'Natural (bell)' },
  { value: 'linear', label: 'Linear' },
  { value: 'flat', label: 'Flat (uniform)' },
];

export function ParamSliders({ params, onChange }: ParamSlidersProps) {
  const handleChromaCurveChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({
        ...params,
        chromaCurve: e.target.value as RampParams['chromaCurve'],
      });
    },
    [params, onChange],
  );

  const handleHueShiftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...params,
        hueShift: Number(e.target.value),
      });
    },
    [params, onChange],
  );

  const handleBaseLightnessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...params,
        baseLightness: Number(e.target.value),
      });
    },
    [params, onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Chroma curve */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-400">
          Chroma Curve
        </label>
        <select
          value={params.chromaCurve}
          onChange={handleChromaCurveChange}
          className="h-8 rounded-md border border-neutral-700 bg-neutral-900 px-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          {CHROMA_CURVES.map((curve) => (
            <option key={curve.value} value={curve.value}>
              {curve.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hue shift */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-neutral-400">
            Hue Shift
          </label>
          <span className="text-xs font-mono text-neutral-500">
            {params.hueShift}°
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={params.hueShift}
          onChange={handleHueShiftChange}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-neutral-400"
          aria-label="Hue shift"
        />
      </div>

      {/* Base lightness */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-neutral-400">
            Base Lightness
          </label>
          <span className="text-xs font-mono text-neutral-500">
            {(params.baseLightness ?? 0.62).toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={params.baseLightness ?? 0.62}
          onChange={handleBaseLightnessChange}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-neutral-400"
          aria-label="Base lightness"
        />
      </div>
    </div>
  );
}
