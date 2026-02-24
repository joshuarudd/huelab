import { describe, it, expect } from 'vitest';
import { applyOverride, clearOverride, clearAllOverrides } from '../overrides.js';
import { generateRamp } from '../ramp.js';
import type { StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('applyOverride', () => {
  it('overrides lightness at a specific stop', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const updated = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    const stop500 = updated.stops.find(s => s.id === 500)!;
    expect(stop500.color.oklch.l).toBeCloseTo(0.59, 1);
    expect(stop500.overridden).toBe(true);
    expect(stop500.overrides).toEqual({ l: 0.59 });
  });

  it('does not affect other stops', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const updated = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    expect(updated.stops.find(s => s.id === 50)!.overridden).toBe(false);
    expect(updated.stops.find(s => s.id === 950)!.overridden).toBe(false);
  });

  it('preserves overrides when ramp params change', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const overridden = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    // Simulate regen with new params — overrides should survive
    const regenerated = applyOverride(
      generateRamp('test', { baseColor: '#cc3366', chromaCurve: 'natural', hueShift: 0 }, STOPS),
      500,
      overridden.stops.find(s => s.id === 500)!.overrides!,
      STOPS,
    );
    expect(regenerated.stops.find(s => s.id === 500)!.color.oklch.l).toBeCloseTo(0.59, 1);
  });
});

describe('clearOverride', () => {
  it('removes override and regenerates stop algorithmically', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const overridden = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    const cleared = clearOverride(overridden, 500, STOPS);
    const stop500 = cleared.stops.find(s => s.id === 500)!;
    expect(stop500.overridden).toBe(false);
    expect(stop500.overrides).toBeUndefined();
    // Should snap back to algorithmic lightness (0.62)
    expect(stop500.color.oklch.l).toBeCloseTo(0.62, 1);
  });
});

describe('clearAllOverrides', () => {
  it('clears all overrides', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    let updated = applyOverride(ramp, 50, { l: 0.99 }, STOPS);
    updated = applyOverride(updated, 500, { l: 0.59 }, STOPS);
    const cleared = clearAllOverrides(updated, STOPS);
    for (const stop of cleared.stops) {
      expect(stop.overridden).toBe(false);
    }
  });
});
