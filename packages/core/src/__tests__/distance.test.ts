import { describe, it, expect } from 'vitest';
import { deltaEOK, oklchComponents } from '../distance.js';

describe('deltaEOK', () => {
  it('returns 0 for identical colors', () => {
    const c = { l: 0.5, c: 0.1, h: 200 };
    expect(deltaEOK(c, c)).toBe(0);
  });

  it('returns positive for different colors', () => {
    const a = { l: 0.5, c: 0.1, h: 200 };
    const b = { l: 0.7, c: 0.2, h: 300 };
    expect(deltaEOK(a, b)).toBeGreaterThan(0);
  });

  it('is symmetric', () => {
    const a = { l: 0.3, c: 0.15, h: 30 };
    const b = { l: 0.7, c: 0.05, h: 240 };
    expect(deltaEOK(a, b)).toBeCloseTo(deltaEOK(b, a), 4);
  });
});

describe('oklchComponents', () => {
  it('decomposes into dL, dC, dH', () => {
    const a = { l: 0.3, c: 0.1, h: 30 };
    const b = { l: 0.7, c: 0.2, h: 60 };
    const result = oklchComponents(a, b);
    expect(result.dL).toBeCloseTo(0.4, 1);
    expect(result.dC).toBeCloseTo(0.1, 1);
    expect(result.dH).toBeCloseTo(30, 0);
  });

  it('handles hue wraparound', () => {
    const a = { l: 0.5, c: 0.1, h: 350 };
    const b = { l: 0.5, c: 0.1, h: 10 };
    const result = oklchComponents(a, b);
    expect(result.dH).toBeCloseTo(20, 0);
  });
});
