import { describe, it, expect } from 'vitest';
import { validatePreset, getStops } from '../preset.js';
import type { Preset } from '../types.js';

const validPreset: Preset = {
  name: 'test-preset',
  description: 'A test preset',
  stops: [
    { id: 50, label: '50', lightness: 0.985 },
    { id: 100, label: '100', lightness: 0.93 },
    { id: 500, label: '500', lightness: 0.62 },
    { id: 950, label: '950', lightness: 0.17 },
  ],
  tokenSchema: {
    tokens: [{ name: '--primary', description: 'Primary color' }],
    pairs: [
      {
        name: 'primary',
        foreground: '--primary-fg',
        background: '--primary',
        threshold: 'normalText',
      },
    ],
    defaultMapping: [
      {
        name: '--primary',
        light: { type: 'ramp', ramp: 'blue', stop: 600 },
        dark: { type: 'ramp', ramp: 'blue', stop: 400 },
      },
    ],
  },
};

describe('validatePreset', () => {
  it('accepts a valid preset', () => {
    expect(() => validatePreset(validPreset)).not.toThrow();
  });

  it('throws if name is empty', () => {
    const preset = { ...validPreset, name: '' };
    expect(() => validatePreset(preset)).toThrow('Preset must have a name');
  });

  it('throws if stops array is empty', () => {
    const preset = { ...validPreset, stops: [] };
    expect(() => validatePreset(preset)).toThrow('Preset must define at least one stop');
  });

  it('throws if tokenSchema.tokens is empty', () => {
    const preset = {
      ...validPreset,
      tokenSchema: { ...validPreset.tokenSchema, tokens: [] },
    };
    expect(() => validatePreset(preset)).toThrow('Preset must define at least one token');
  });

  it('accepts a preset without description', () => {
    const { description: _, ...presetNoDesc } = validPreset;
    expect(() => validatePreset(presetNoDesc as Preset)).not.toThrow();
  });
});

describe('getStops', () => {
  it('returns the stops from a preset', () => {
    const stops = getStops(validPreset);
    expect(stops).toHaveLength(4);
    expect(stops[0].id).toBe(50);
    expect(stops[3].id).toBe(950);
  });

  it('returns a copy independent of the preset', () => {
    const stops = getStops(validPreset);
    expect(stops).toEqual(validPreset.stops);
  });
});
