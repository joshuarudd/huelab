import { describe, it, expect } from 'vitest';
import { parseColor, toColor, formatOklchCss, toHex, clampToSrgb, isInGamut, hueDifference } from '../oklch.js';

describe('parseColor', () => {
  it('parses hex to OKLCH', () => {
    const result = parseColor('#ff0000');
    expect(result).toBeDefined();
    expect(result!.l).toBeCloseTo(0.6279, 2);
    expect(result!.c).toBeGreaterThan(0.2);
    expect(result!.h).toBeCloseTo(29.2, 0);
  });

  it('parses oklch() CSS string', () => {
    const result = parseColor('oklch(62% 0.25 30)');
    expect(result).toBeDefined();
    expect(result!.l).toBeCloseTo(0.62, 2);
    expect(result!.c).toBeCloseTo(0.25, 2);
    expect(result!.h).toBeCloseTo(30, 0);
  });

  it('returns undefined for invalid input', () => {
    expect(parseColor('not-a-color')).toBeUndefined();
  });
});

describe('toColor', () => {
  it('returns Color with oklch, hex, and rgb', () => {
    const color = toColor('#2c4c60');
    expect(color.hex).toBe('#2c4c60');
    expect(color.oklch.l).toBeGreaterThan(0);
    expect(color.rgb.r).toBe(44);
    expect(color.rgb.g).toBe(76);
    expect(color.rgb.b).toBe(96);
  });

  it('throws for invalid input', () => {
    expect(() => toColor('garbage')).toThrow();
  });
});

describe('formatOklchCss', () => {
  it('formats as oklch(L% C H)', () => {
    const result = formatOklchCss(0.62, 0.25, 30);
    expect(result).toBe('oklch(62% 0.25 30)');
  });

  it('handles zero values without -0', () => {
    const result = formatOklchCss(0.5, 0, 0);
    expect(result).not.toContain('-0');
  });
});

describe('toHex', () => {
  it('converts CSS color to hex', () => {
    expect(toHex('oklch(62% 0.25 30)')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('clampToSrgb', () => {
  it('returns same color if already in gamut', () => {
    const color = { l: 0.5, c: 0.1, h: 180 };
    const clamped = clampToSrgb(color);
    expect(clamped.l).toBeCloseTo(0.5);
    expect(clamped.c).toBeCloseTo(0.1, 1);
  });

  it('reduces chroma for out-of-gamut colors', () => {
    const outOfGamut = { l: 0.9, c: 0.4, h: 150 };
    const clamped = clampToSrgb(outOfGamut);
    expect(clamped.l).toBeCloseTo(0.9, 1); // lightness preserved
    expect(clamped.c).toBeLessThan(0.4); // chroma reduced
  });
});

describe('isInGamut', () => {
  it('returns true for white', () => {
    // This tests the epsilon fix for culori displayable() bug
    expect(isInGamut({ l: 1, c: 0, h: 0 })).toBe(true);
  });

  it('returns true for black', () => {
    expect(isInGamut({ l: 0, c: 0, h: 0 })).toBe(true);
  });

  it('returns false for extreme chroma', () => {
    expect(isInGamut({ l: 0.5, c: 0.5, h: 150 })).toBe(false);
  });
});

describe('hueDifference', () => {
  it('computes direct difference', () => {
    expect(hueDifference(30, 60)).toBe(30);
  });

  it('handles wraparound', () => {
    expect(hueDifference(350, 10)).toBe(20);
  });

  it('is symmetric', () => {
    expect(hueDifference(10, 350)).toBe(hueDifference(350, 10));
  });
});
