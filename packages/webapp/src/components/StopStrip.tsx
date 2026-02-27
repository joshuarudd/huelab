/**
 * StopStrip — vertical strip of all stop swatches in a ramp.
 *
 * Each stop shows:
 * - Color swatch
 * - Hex value
 * - L/C/H values
 * - Click to select
 * - Override badge if pinned (click badge to clear override)
 *
 * When a stop is selected, L/C/H override sliders appear below
 * for fine-grained editing.
 */

import { useState, useCallback } from 'react';
import type { Ramp, RampStop, OklchColor } from '@huelab/core';

interface StopStripProps {
  ramp: Ramp;
  onOverride: (stopId: number, overrides: Partial<OklchColor>) => void;
  onClearOverride: (stopId: number) => void;
}

/** Format a number to fixed decimal places */
function fmt(n: number, digits: number): string {
  return n.toFixed(digits);
}

function StopSwatch({
  stop,
  isSelected,
  isBase,
  onSelect,
  onClearOverride,
}: {
  stop: RampStop;
  isSelected: boolean;
  isBase: boolean;
  onSelect: () => void;
  onClearOverride: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
        isSelected
          ? 'bg-[var(--app-elevated)] ring-1 ring-[var(--app-border-input)]'
          : 'hover:bg-[var(--app-elevated)]'
      }`}
      aria-label={`Stop ${stop.id}`}
      aria-pressed={isSelected}
    >
      {/* Color swatch */}
      <div
        className="h-7 w-7 shrink-0 rounded border border-[var(--app-border-secondary)]"
        style={{ backgroundColor: stop.color.hex }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--app-text-secondary)]">
            {stop.id}
          </span>
          {isBase && (
            <span className="rounded bg-[var(--app-hover)] px-1 py-0.5 text-[10px] font-medium leading-none text-[var(--app-text-secondary)]">
              base
            </span>
          )}
          {stop.overridden && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearOverride();
              }}
              className="rounded bg-[var(--app-warning-bg)] px-1 py-0.5 text-[10px] font-medium leading-none text-[var(--app-warning-text)] hover:opacity-80"
              aria-label={`Clear override for stop ${stop.id}`}
              title="Click to clear override"
            >
              pinned
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--app-text-muted)]">
          <span>{stop.color.hex}</span>
          <span>L{fmt(stop.color.oklch.l, 2)}</span>
          <span>C{fmt(stop.color.oklch.c, 3)}</span>
          <span>H{fmt(stop.color.oklch.h, 0)}</span>
        </div>
      </div>
    </button>
  );
}

function OverrideSliders({
  stop,
  onOverride,
}: {
  stop: RampStop;
  onOverride: (overrides: Partial<OklchColor>) => void;
}) {
  const oklch = stop.color.oklch;

  const handleLChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOverride({ l: Number(e.target.value) });
    },
    [onOverride],
  );

  const handleCChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOverride({ c: Number(e.target.value) });
    },
    [onOverride],
  );

  const handleHChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOverride({ h: Number(e.target.value) });
    },
    [onOverride],
  );

  return (
    <div className="ml-2 flex flex-col gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
        Override Stop {stop.id}
      </p>

      {/* Lightness */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-[var(--app-text-muted)]">
            Lightness
          </label>
          <span className="text-[10px] font-mono text-[var(--app-text-muted)]">
            {fmt(oklch.l, 3)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={oklch.l}
          onChange={handleLChange}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--app-hover)] accent-[var(--app-text-muted)]"
          aria-label={`Lightness for stop ${stop.id}`}
        />
      </div>

      {/* Chroma */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-[var(--app-text-muted)]">
            Chroma
          </label>
          <span className="text-[10px] font-mono text-[var(--app-text-muted)]">
            {fmt(oklch.c, 4)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={0.4}
          step={0.001}
          value={oklch.c}
          onChange={handleCChange}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--app-hover)] accent-[var(--app-text-muted)]"
          aria-label={`Chroma for stop ${stop.id}`}
        />
      </div>

      {/* Hue */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-[var(--app-text-muted)]">
            Hue
          </label>
          <span className="text-[10px] font-mono text-[var(--app-text-muted)]">
            {fmt(oklch.h, 1)}°
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={0.5}
          value={oklch.h}
          onChange={handleHChange}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--app-hover)] accent-[var(--app-text-muted)]"
          aria-label={`Hue for stop ${stop.id}`}
        />
      </div>
    </div>
  );
}

export function StopStrip({ ramp, onOverride, onClearOverride }: StopStripProps) {
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);

  const selectedStop = selectedStopId !== null
    ? ramp.stops.find((s) => s.id === selectedStopId)
    : undefined;

  const handleStopOverride = useCallback(
    (overrides: Partial<OklchColor>) => {
      if (selectedStopId !== null) {
        onOverride(selectedStopId, overrides);
      }
    },
    [selectedStopId, onOverride],
  );

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-[var(--app-text-muted)]">Stops</p>
      <div className="flex flex-col gap-0.5">
        {ramp.stops.map((stop) => (
          <div key={stop.id}>
            <StopSwatch
              stop={stop}
              isSelected={selectedStopId === stop.id}
              isBase={stop.id === ramp.baseStopId}
              onSelect={() =>
                setSelectedStopId(
                  selectedStopId === stop.id ? null : stop.id,
                )
              }
              onClearOverride={() => onClearOverride(stop.id)}
            />
            {selectedStopId === stop.id && selectedStop && (
              <OverrideSliders
                stop={selectedStop}
                onOverride={handleStopOverride}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
