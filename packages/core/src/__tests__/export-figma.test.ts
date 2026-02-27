import { describe, it, expect } from 'vitest';
import { exportFigmaJSON } from '../export-figma.js';
import { generateRamp } from '../ramp.js';
import { resolveTokens } from '../resolver.js';
import type { TokenDefinition, StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('exportFigmaJSON', () => {
  it('emits primitives collection with RGB 0-1 values', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const output = exportFigmaJSON([ramp], resolved, tokens);
    expect(output.primitives.variables.length).toBe(3); // 3 stops
    expect(output.primitives.variables[0].value.r).toBeGreaterThanOrEqual(0);
    expect(output.primitives.variables[0].value.r).toBeLessThanOrEqual(1);
  });

  it('emits semantic tokens as aliases when ramp-based', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const output = exportFigmaJSON([ramp], resolved, tokens);
    expect(output.semantic.variables[0].light).toEqual({ type: 'alias', name: 'color/blue/500' });
  });

  it('includes codeSyntax when enabled', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const output = exportFigmaJSON([ramp], resolved, tokens, { includeCodeSyntax: true });
    expect(output.primitives.variables[0].codeSyntax?.WEB).toBeDefined();
    expect(output.semantic.variables[0].codeSyntax?.WEB).toBe('--primary');
  });
});
