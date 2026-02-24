import { describe, it, expect } from 'vitest';
import { exportRampJSON, exportTokensJSON } from '../export-json.js';
import { generateRamp } from '../ramp.js';
import { resolveTokens } from '../resolver.js';
import type { TokenDefinition, StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('exportRampJSON', () => {
  it('exports a ramp as valid JSON', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const json = exportRampJSON(ramp);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('blue');
    expect(parsed.stops).toHaveLength(3);
    expect(parsed.stops[0].id).toBe(50);
  });

  it('produces pretty-printed JSON with 2-space indent', () => {
    const ramp = generateRamp('red', { baseColor: '#cc3333', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const json = exportRampJSON(ramp);
    // Pretty-printed JSON starts with {\n  "
    expect(json).toMatch(/^\{\n {2}"/);
  });

  it('round-trips the ramp data faithfully', () => {
    const ramp = generateRamp('green', { baseColor: '#33cc66', chromaCurve: 'linear', hueShift: 10 }, STOPS);
    const json = exportRampJSON(ramp);
    const parsed = JSON.parse(json);
    expect(parsed.params.baseColor).toBe('#33cc66');
    expect(parsed.params.chromaCurve).toBe('linear');
    expect(parsed.params.hueShift).toBe(10);
  });
});

describe('exportTokensJSON', () => {
  it('exports resolved tokens as valid JSON', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [
      {
        name: '--primary',
        light: { type: 'ramp', ramp: 'blue', stop: 500 },
        dark: { type: 'ramp', ramp: 'blue', stop: 500 },
      },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const json = exportTokensJSON(resolved);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('--primary');
    expect(parsed[0].lightSource).toBe('blue-500');
  });

  it('exports multiple tokens', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [
      {
        name: '--primary',
        light: { type: 'ramp', ramp: 'blue', stop: 500 },
        dark: { type: 'ramp', ramp: 'blue', stop: 50 },
      },
      {
        name: '--bg',
        light: { type: 'literal', value: '#ffffff' },
        dark: { type: 'literal', value: '#000000' },
      },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const json = exportTokensJSON(resolved);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('--primary');
    expect(parsed[1].name).toBe('--bg');
  });

  it('produces pretty-printed JSON', () => {
    const json = exportTokensJSON([]);
    expect(json).toBe('[]');
  });
});
