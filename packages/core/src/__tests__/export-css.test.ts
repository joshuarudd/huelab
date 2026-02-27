import { describe, it, expect } from 'vitest';
import { exportPrimitivesCSS, exportSemanticCSS, exportTailwindMappingCSS } from '../export-css.js';
import { generateRamp } from '../ramp.js';
import { resolveTokens } from '../resolver.js';
import type { TokenDefinition, StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('exportPrimitivesCSS', () => {
  it('emits @theme block with --color-{name}-{stop} variables', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const css = exportPrimitivesCSS([ramp]);
    expect(css).toContain('@theme');
    expect(css).toContain('--color-blue-50');
    expect(css).toContain('--color-blue-500');
    expect(css).toContain('--color-blue-950');
    expect(css).toContain('oklch(');
  });

  it('emits variables for multiple ramps', () => {
    const blue = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const red = generateRamp('red', { baseColor: '#cc3333' }, STOPS);
    const css = exportPrimitivesCSS([blue, red]);
    expect(css).toContain('--color-blue-500');
    expect(css).toContain('--color-red-500');
  });

  it('wraps output in a single @theme block', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const css = exportPrimitivesCSS([ramp]);
    // Should start with @theme { and end with }
    expect(css.trim()).toMatch(/^@theme\s*\{[\s\S]*\}$/);
  });

  it('returns empty @theme block for empty ramps array', () => {
    const css = exportPrimitivesCSS([]);
    expect(css).toContain('@theme');
  });
});

describe('exportSemanticCSS', () => {
  it('emits :root and .dark blocks', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const css = exportSemanticCSS(resolved, tokens);
    expect(css).toContain(':root');
    expect(css).toContain('.dark');
    expect(css).toContain('--primary');
    expect(css).toContain('var(--color-blue-500)');
    expect(css).toContain('var(--color-blue-50)');
  });

  it('emits literal values inline for literal tokens', () => {
    const tokens: TokenDefinition[] = [
      { name: '--background', light: { type: 'literal', value: '#ffffff' }, dark: { type: 'literal', value: '#000000' } },
    ];
    const resolved = resolveTokens(tokens, []);
    const css = exportSemanticCSS(resolved, tokens);
    expect(css).toContain(':root');
    expect(css).toContain('.dark');
    expect(css).toContain('--background');
    // Literal tokens should be emitted inline (not as var() refs)
    expect(css).not.toContain('var(--color-');
  });

  it('handles mixed ramp and literal tokens', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc' }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
      { name: '--background', light: { type: 'literal', value: '#ffffff' }, dark: { type: 'literal', value: '#000000' } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const css = exportSemanticCSS(resolved, tokens);
    expect(css).toContain('var(--color-blue-500)');
    expect(css).toContain('--background');
  });
});

describe('exportTailwindMappingCSS', () => {
  it('emits @theme inline block', () => {
    const tokens = ['--primary', '--background'];
    const css = exportTailwindMappingCSS(tokens);
    expect(css).toContain('@theme inline');
    expect(css).toContain('--primary');
    expect(css).toContain('--background');
  });

  it('maps each token to var() self-reference', () => {
    const tokens = ['--primary'];
    const css = exportTailwindMappingCSS(tokens);
    expect(css).toContain('--primary: var(--primary)');
  });

  it('returns empty @theme inline block for empty input', () => {
    const css = exportTailwindMappingCSS([]);
    expect(css).toContain('@theme inline');
  });
});
