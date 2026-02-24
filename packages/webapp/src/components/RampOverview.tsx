/**
 * RampOverview — bottom strip showing all loaded ramps as compact rows.
 *
 * Each row displays the ramp name, 11 color swatches, and a remove button.
 * Clicking a row selects it for editing. A "+" button adds new ramps.
 * Ramps not referenced by any token are visually dimmed.
 */

import { useMemo, useCallback } from 'react';
import { useProject } from '../store.js';

/**
 * Determine which ramp names are referenced by at least one token mapping.
 * Checks both light and dark sources across all token definitions.
 */
function useReferencedRampNames(): Set<string> {
  const { state } = useProject();
  return useMemo(() => {
    const names = new Set<string>();
    for (const token of state.tokenMapping) {
      if (token.light.type === 'ramp') names.add(token.light.ramp);
      if (token.dark.type === 'ramp') names.add(token.dark.ramp);
    }
    return names;
  }, [state.tokenMapping]);
}

export function RampOverview() {
  const { state, dispatch } = useProject();
  const referencedNames = useReferencedRampNames();

  const handleAddRamp = useCallback(() => {
    dispatch({
      type: 'ADD_RAMP',
      name: 'color-' + Date.now(),
      params: { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 },
    });
  }, [dispatch]);

  const handleSelectRamp = useCallback(
    (index: number) => {
      dispatch({ type: 'SELECT_RAMP', index });
    },
    [dispatch],
  );

  const handleRemoveRamp = useCallback(
    (index: number, event: React.MouseEvent) => {
      // Prevent row click (SELECT_RAMP) from firing
      event.stopPropagation();
      dispatch({ type: 'REMOVE_RAMP', index });
    },
    [dispatch],
  );

  return (
    <div className="flex flex-col gap-1">
      {/* Ramp rows */}
      {state.ramps.map((ramp, index) => {
        const isSelected = index === state.selectedRampIndex;
        const isReferenced = referencedNames.has(ramp.name);

        return (
          <div
            key={ramp.name}
            role="button"
            tabIndex={0}
            onClick={() => handleSelectRamp(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectRamp(index);
              }
            }}
            className={[
              'flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition-colors',
              isSelected
                ? 'bg-neutral-700 ring-1 ring-neutral-500'
                : 'bg-neutral-800/50 hover:bg-neutral-800',
              !isReferenced ? 'opacity-40' : '',
            ].join(' ')}
          >
            {/* Ramp name */}
            <span
              className="w-28 shrink-0 truncate text-xs font-medium text-neutral-300"
              title={ramp.name}
            >
              {ramp.name}
            </span>

            {/* Color swatches */}
            <div className="flex gap-px">
              {ramp.stops.map((stop) => (
                <div
                  key={stop.id}
                  className="h-5 w-5 rounded-sm"
                  style={{ backgroundColor: stop.color.hex }}
                  title={`${ramp.name}-${stop.id}: ${stop.color.hex}`}
                />
              ))}
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => handleRemoveRamp(index, e)}
              className="ml-auto shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-600 hover:text-neutral-200 transition-colors"
              aria-label={`Remove ramp ${ramp.name}`}
              title="Remove ramp"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
              </svg>
            </button>
          </div>
        );
      })}

      {/* Empty state */}
      {state.ramps.length === 0 && (
        <p className="text-xs text-neutral-500 py-1">
          No ramps loaded. Add one to get started.
        </p>
      )}

      {/* Add ramp button */}
      <button
        type="button"
        onClick={handleAddRamp}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        Add ramp
      </button>
    </div>
  );
}
