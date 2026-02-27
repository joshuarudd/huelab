import { describe, it, expect } from 'vitest';
import { generateRamp, computeBaseStopHex, AUTO_HUE_SHIFT_DEGREES } from '../ramp.js';
import { parseColor } from '../oklch.js';
import type { StopDefinition } from '../types.js';

// Use the Tailwind stops from the shadcn preset
const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 100, label: '100', lightness: 0.93 },
  { id: 200, label: '200', lightness: 0.87 },
  { id: 300, label: '300', lightness: 0.80 },
  { id: 400, label: '400', lightness: 0.71 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 600, label: '600', lightness: 0.53 },
  { id: 700, label: '700', lightness: 0.45 },
  { id: 800, label: '800', lightness: 0.37 },
  { id: 900, label: '900', lightness: 0.27 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('generateRamp', () => {
  it('generates correct number of stops', () => {
    const ramp = generateRamp('slate-blue', { baseColor: '#2c4c60' }, STOPS);
    expect(ramp.stops).toHaveLength(11);
  });

  it('stop IDs match definitions', () => {
    const ramp = generateRamp('test', { baseColor: '#ff0000' }, STOPS);
    expect(ramp.stops.map(s => s.id)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
  });

  it('lightness decreases monotonically', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc' }, STOPS);
    for (let i = 1; i < ramp.stops.length; i++) {
      expect(ramp.stops[i].color.oklch.l).toBeLessThan(ramp.stops[i - 1].color.oklch.l);
    }
  });

  it('all stops are in sRGB gamut', () => {
    const ramp = generateRamp('test', { baseColor: 'oklch(60% 0.3 150)' }, STOPS);
    for (const stop of ramp.stops) {
      expect(stop.color.rgb.r).toBeGreaterThanOrEqual(0);
      expect(stop.color.rgb.r).toBeLessThanOrEqual(255);
      expect(stop.color.rgb.g).toBeGreaterThanOrEqual(0);
      expect(stop.color.rgb.g).toBeLessThanOrEqual(255);
      expect(stop.color.rgb.b).toBeGreaterThanOrEqual(0);
      expect(stop.color.rgb.b).toBeLessThanOrEqual(255);
    }
  });

  it('natural curve peaks chroma at midtones', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc' }, STOPS, 'natural');
    const stop50 = ramp.stops[0];
    const stop500 = ramp.stops[5];
    const stop950 = ramp.stops[10];
    expect(stop500.color.oklch.c).toBeGreaterThan(stop50.color.oklch.c);
    expect(stop500.color.oklch.c).toBeGreaterThan(stop950.color.oklch.c);
  });

  it('flat curve has uniform chroma (before gamut clamp)', () => {
    const ramp = generateRamp('test', { baseColor: '#666666' }, STOPS, 'flat');
    // Flat curve on a low-chroma input: all stops should have similar chroma
    const chromas = ramp.stops.map(s => s.color.oklch.c);
    const maxC = Math.max(...chromas);
    const minC = Math.min(...chromas);
    expect(maxC - minC).toBeLessThan(0.02); // Nearly uniform for low-chroma input
  });

  it('applies auto hue shift across lightness range', () => {
    const ramp = generateRamp('test', { baseColor: 'oklch(50% 0.15 200)' }, STOPS, 'natural', true);
    const lightest = ramp.stops[0].color.oklch.h;
    const darkest = ramp.stops[10].color.oklch.h;
    expect(Math.abs(darkest - lightest)).toBeGreaterThan(5);
  });

  it('does not shift hue when autoHueShift is off', () => {
    const ramp = generateRamp('test', { baseColor: 'oklch(50% 0.15 200)' }, STOPS, 'natural', false);
    const lightest = ramp.stops[0].color.oklch.h;
    const darkest = ramp.stops[10].color.oklch.h;
    expect(Math.abs(darkest - lightest)).toBeLessThan(1);
  });

  it('achromatic input forces hue to 0', () => {
    const ramp = generateRamp('neutral', { baseColor: '#808080' }, STOPS, 'flat');
    for (const stop of ramp.stops) {
      expect(stop.color.oklch.h).toBe(0);
    }
  });

  it('stops are not overridden by default', () => {
    const ramp = generateRamp('test', { baseColor: '#ff0000' }, STOPS);
    for (const stop of ramp.stops) {
      expect(stop.overridden).toBe(false);
    }
  });

  it('finds closest base stop', () => {
    // #2c4c60 has L ~0.38, closest to stop 800 (L=0.37)
    const ramp = generateRamp('test', { baseColor: '#2c4c60' }, STOPS);
    expect(ramp.baseStopId).toBe(800);
  });

  it('all stops use their fixed lightness targets', () => {
    const ramp = generateRamp('test', {
      baseColor: 'oklch(66% 0.19 30)',
    }, STOPS);
    for (let i = 0; i < ramp.stops.length; i++) {
      expect(ramp.stops[i].color.oklch.l).toBeCloseTo(STOPS[i].lightness, 1);
    }
  });

  it('base stop chroma matches base color chroma', () => {
    // #c81600 maps to stop 600 — its chroma should be preserved
    const ramp = generateRamp('red', { baseColor: '#c81600' }, STOPS, 'natural');
    const baseStop = ramp.stops.find(s => s.id === ramp.baseStopId)!;
    const baseOklch = parseColor('#c81600')!;
    expect(baseStop.color.oklch.c).toBeCloseTo(baseOklch.c, 2);
  });
});

describe('computeBaseStopHex', () => {
  it('returns a valid hex string', () => {
    const hex = computeBaseStopHex('#3366cc', STOPS, 'natural');
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns null for an invalid color', () => {
    const hex = computeBaseStopHex('not-a-color', STOPS, 'natural');
    expect(hex).toBeNull();
  });

  it('is idempotent — feeding the result back in produces the same result', () => {
    const testColors = ['#c32615', '#ff0000', '#cc0000', '#3366cc', '#808080', '#e63946'];
    for (const color of testColors) {
      const hex1 = computeBaseStopHex(color, STOPS, 'natural');
      expect(hex1).not.toBeNull();
      const hex2 = computeBaseStopHex(hex1!, STOPS, 'natural');
      expect(hex2).toBe(hex1);
    }
  });

  it('preserves hue and chroma, only adjusts lightness to match stop target', () => {
    // A color whose lightness already matches a stop target should return itself
    // #c32615 has L≈0.53 which matches stop 600 (L=0.53)
    const hex = computeBaseStopHex('#c32615', STOPS, 'natural');
    expect(hex).toBe('#c32615');
  });
});
