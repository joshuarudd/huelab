import { describe, it, expect } from 'vitest';
import { importCSS } from '../import-css.js';

const SAMPLE_CSS = `
@theme {
  --color-blue-50: oklch(98.5% 0.008 237);
  --color-blue-100: oklch(93% 0.02 237);
  --color-blue-500: oklch(62% 0.1 237);
  --color-blue-800: oklch(37% 0.07 237);
  --color-blue-950: oklch(17% 0.04 237);
}

:root {
  --primary: var(--color-blue-800);
  --primary-foreground: oklch(98.5% 0.008 237);
  --background: #ffffff;
}

.dark {
  --primary: var(--color-blue-500);
  --primary-foreground: #ffffff;
  --background: oklch(17% 0 0);
}
`;

describe('importCSS', () => {
  it('extracts ramp stops from @theme block', () => {
    const result = importCSS(SAMPLE_CSS);
    expect(result.ramps.length).toBeGreaterThanOrEqual(1);
    const blueRamp = result.ramps.find(r => r.name === 'blue');
    expect(blueRamp).toBeDefined();
    expect(blueRamp!.stops.length).toBeGreaterThanOrEqual(5);
  });

  it('extracts light tokens from :root', () => {
    const result = importCSS(SAMPLE_CSS);
    expect(result.tokens.light['--primary']).toBeDefined();
    expect(result.tokens.light['--background']).toBeDefined();
  });

  it('extracts dark tokens from .dark', () => {
    const result = importCSS(SAMPLE_CSS);
    expect(result.tokens.dark['--primary']).toBeDefined();
    expect(result.tokens.dark['--background']).toBeDefined();
  });

  it('resolves var() references to ramp values', () => {
    const result = importCSS(SAMPLE_CSS);
    // --primary: var(--color-blue-800) should resolve to the blue-800 value
    expect(result.tokens.light['--primary']).toContain('oklch');
  });

  it('sorts ramp stops by id', () => {
    const result = importCSS(SAMPLE_CSS);
    const blueRamp = result.ramps.find(r => r.name === 'blue')!;
    const ids = blueRamp.stops.map(s => s.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('handles multiple ramps', () => {
    const css = `
@theme {
  --color-red-50: oklch(97% 0.01 25);
  --color-red-500: oklch(63% 0.24 25);
  --color-blue-50: oklch(98.5% 0.008 237);
  --color-blue-500: oklch(62% 0.1 237);
}
`;
    const result = importCSS(css);
    expect(result.ramps.length).toBe(2);
    expect(result.ramps.find(r => r.name === 'red')).toBeDefined();
    expect(result.ramps.find(r => r.name === 'blue')).toBeDefined();
  });

  it('handles empty input', () => {
    const result = importCSS('');
    expect(result.ramps).toEqual([]);
    expect(result.tokens.light).toEqual({});
    expect(result.tokens.dark).toEqual({});
  });

  it('handles CSS with no @theme block', () => {
    const css = `
:root {
  --primary: #ff0000;
}
`;
    const result = importCSS(css);
    expect(result.ramps).toEqual([]);
    expect(result.tokens.light['--primary']).toBe('#ff0000');
  });

  it('preserves non-ramp primitives in @theme as unresolved', () => {
    const css = `
@theme {
  --color-blue-500: oklch(62% 0.1 237);
  --radius: 0.5rem;
}
`;
    const result = importCSS(css);
    // --radius is not a ramp color, so it's stored as a primitive but not in ramps
    expect(result.ramps.length).toBe(1);
  });

  it('resolves nested var() in :root', () => {
    const css = `
@theme {
  --color-green-500: oklch(72% 0.15 145);
}

:root {
  --accent: var(--color-green-500);
}
`;
    const result = importCSS(css);
    expect(result.tokens.light['--accent']).toBe('oklch(72% 0.15 145)');
  });
});
