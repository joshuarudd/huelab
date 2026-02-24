import { describe, it, expect } from 'vitest';
import { auditTokenPairs } from '../audit.js';
import { resolveTokens } from '../resolver.js';
import { generateRamp } from '../ramp.js';
import type { TokenDefinition, TokenPairDefinition, StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 800, label: '800', lightness: 0.37 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('auditTokenPairs', () => {
  it('passes for high-contrast pair', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 800 }, dark: { type: 'ramp', ramp: 'blue', stop: 500 } },
      { name: '--primary-fg', light: { type: 'literal', value: '#ffffff' }, dark: { type: 'literal', value: '#ffffff' } },
    ];
    const pairs: TokenPairDefinition[] = [
      { name: 'primary', foreground: '--primary-fg', background: '--primary', threshold: 'normalText' },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const report = auditTokenPairs(resolved, pairs);
    expect(report.summary.totalPairs).toBe(1);
    expect(report.summary.lightPasses).toBe(1);
  });

  it('fails for low-contrast pair', () => {
    const ramp = generateRamp('gray', { baseColor: '#808080', chromaCurve: 'flat', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--muted', light: { type: 'ramp', ramp: 'gray', stop: 500 }, dark: { type: 'ramp', ramp: 'gray', stop: 500 } },
      { name: '--muted-fg', light: { type: 'ramp', ramp: 'gray', stop: 800 }, dark: { type: 'ramp', ramp: 'gray', stop: 800 } },
    ];
    const pairs: TokenPairDefinition[] = [
      { name: 'muted', foreground: '--muted-fg', background: '--muted', threshold: 'normalText' },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const report = auditTokenPairs(resolved, pairs);
    // Gray 500 (L=0.62) vs gray 800 (L=0.37) — should fail 4.5:1
    expect(report.summary.failures.length).toBeGreaterThan(0);
  });
});
