import { describe, it, expect } from 'vitest';
import { wcagRatio, apcaLc, checkContrast, AA_THRESHOLDS } from '../contrast.js';

describe('wcagRatio', () => {
  it('returns 21 for black on white', () => {
    const black = { l: 0, c: 0, h: 0 };
    const white = { l: 1, c: 0, h: 0 };
    expect(wcagRatio(black, white)).toBeCloseTo(21, 0);
  });

  it('returns 1 for same color', () => {
    const color = { l: 0.5, c: 0.1, h: 200 };
    expect(wcagRatio(color, color)).toBeCloseTo(1, 0);
  });

  it('is symmetric (ratio is same regardless of fg/bg order)', () => {
    const a = { l: 0.3, c: 0.1, h: 200 };
    const b = { l: 0.8, c: 0.05, h: 200 };
    expect(wcagRatio(a, b)).toBeCloseTo(wcagRatio(b, a), 1);
  });
});

describe('apcaLc', () => {
  it('returns positive for dark text on light bg', () => {
    const dark = { l: 0, c: 0, h: 0 };
    const light = { l: 1, c: 0, h: 0 };
    expect(apcaLc(dark, light)).toBeGreaterThan(0);
  });

  it('returns negative for light text on dark bg', () => {
    const dark = { l: 0, c: 0, h: 0 };
    const light = { l: 1, c: 0, h: 0 };
    expect(apcaLc(light, dark)).toBeLessThan(0);
  });

  it('returns ~106 Lc for black on white', () => {
    const black = { l: 0, c: 0, h: 0 };
    const white = { l: 1, c: 0, h: 0 };
    const lc = apcaLc(black, white);
    expect(lc).toBeGreaterThan(100);
    expect(lc).toBeLessThan(110);
  });
});

describe('checkContrast', () => {
  it('returns full ContrastResult', () => {
    const fg = { l: 0, c: 0, h: 0 };
    const bg = { l: 1, c: 0, h: 0 };
    const result = checkContrast(fg, bg);
    expect(result.wcagRatio).toBeGreaterThan(20);
    expect(result.passesAA.normalText).toBe(true);
    expect(result.passesAA.largeText).toBe(true);
  });

  it('fails AA for low contrast pair', () => {
    const a = { l: 0.6, c: 0.1, h: 30 };
    const b = { l: 0.7, c: 0.05, h: 30 };
    const result = checkContrast(a, b);
    expect(result.passesAA.normalText).toBe(false);
  });
});

describe('AA_THRESHOLDS', () => {
  it('has correct values', () => {
    expect(AA_THRESHOLDS.normalText).toBe(4.5);
    expect(AA_THRESHOLDS.largeText).toBe(3);
    expect(AA_THRESHOLDS.uiComponent).toBe(3);
  });
});
