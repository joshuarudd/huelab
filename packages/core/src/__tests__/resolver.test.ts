import { describe, it, expect } from 'vitest';
import { resolveTokens } from '../resolver.js';
import { generateRamp } from '../ramp.js';
import type { TokenDefinition, StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 800, label: '800', lightness: 0.37 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('resolveTokens', () => {
  it('resolves ramp-based token to concrete color', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [{
      name: '--primary',
      light: { type: 'ramp', ramp: 'blue', stop: 800 },
      dark: { type: 'ramp', ramp: 'blue', stop: 500 },
    }];
    const resolved = resolveTokens(tokens, [ramp]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].name).toBe('--primary');
    expect(resolved[0].light.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(resolved[0].dark.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(resolved[0].lightSource).toBe('blue-800');
    expect(resolved[0].darkSource).toBe('blue-500');
  });

  it('resolves literal token', () => {
    const tokens: TokenDefinition[] = [{
      name: '--background',
      light: { type: 'literal', value: '#ffffff' },
      dark: { type: 'literal', value: 'oklch(17% 0 0)' },
    }];
    const resolved = resolveTokens(tokens, []);
    expect(resolved[0].light.hex).toBe('#ffffff');
    expect(resolved[0].lightSource).toBe('literal');
  });

  it('throws for missing ramp', () => {
    const tokens: TokenDefinition[] = [{
      name: '--primary',
      light: { type: 'ramp', ramp: 'nonexistent', stop: 500 },
      dark: { type: 'ramp', ramp: 'nonexistent', stop: 500 },
    }];
    expect(() => resolveTokens(tokens, [])).toThrow('nonexistent');
  });
});
