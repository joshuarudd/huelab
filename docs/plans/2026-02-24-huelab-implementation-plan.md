# huelab v0.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the @huelab/core library and @huelab/webapp to enable interactive accessible color system design with real-time feedback, import, and export.

**Architecture:** Monorepo with three packages. `@huelab/core` is a pure TypeScript library (zero DOM deps) that handles OKLCH color math, ramp generation, token resolution, contrast auditing, and import/export. `@huelab/webapp` is a React + Vite client-side app that consumes `@huelab/core` for a three-panel interactive editor. `@huelab/preset-shadcn` provides the shadcn/ui + Tailwind v4 token schema.

**Tech Stack:** TypeScript, culori (OKLCH math), apca-w3 (APCA contrast), React 19, Vite 6, Tailwind CSS v4, Vitest (testing)

**Design doc:** `docs/plans/2026-02-24-huelab-oss-design.md`
**Technical reference:** `REFERENCE.md` (gotchas, algorithms, lessons learned)
**Collabrios reference code:** `~/GitHub/collabrios/src/` (algorithms to rewrite, not copy)

---

## Phase 1: Core Library Foundation

### Task 1: Testing infrastructure + OKLCH color math

**Files:**
- Modify: `packages/core/package.json` (add vitest)
- Modify: `packages/core/src/oklch.ts`
- Create: `packages/core/src/__tests__/oklch.test.ts`

**Step 1: Add vitest to core package**

Add to `packages/core/package.json` devDependencies:
```json
"vitest": "^3.0.0"
```

Add script:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Add a root-level `packages/core/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/__tests__/**/*.test.ts'] } });
```

Run: `cd packages/core && npm install`

**Step 2: Write failing tests for OKLCH module**

Create `packages/core/src/__tests__/oklch.test.ts`:

```typescript
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
```

**Step 3: Run tests to verify they fail**

Run: `cd packages/core && npx vitest run`
Expected: All tests fail (functions not exported)

**Step 4: Implement oklch.ts**

Replace `packages/core/src/oklch.ts` with the full implementation. Reference: `~/GitHub/collabrios/src/lib/color-utils.ts`. Key functions:
- `parseColor(input: string): OklchColor | undefined` — parse any CSS color to OKLCH via culori
- `toColor(input: string): Color` — full Color object (oklch + hex + rgb), throws on invalid
- `formatOklchCss(l, c, h): string` — format as `oklch(L% C H)`, normalize `-0` with `|| 0`
- `toHex(input: string): string` — any CSS color to hex
- `clampToSrgb(color: OklchColor): OklchColor` — reduce chroma, preserve lightness via culori `clampChroma`
- `isInGamut(color: OklchColor): boolean` — RGB epsilon check (NOT culori `displayable()` which fails on white)
- `hueDifference(h1, h2): number` — wraparound-safe hue distance

**Important gotchas** (from REFERENCE.md):
- culori's `displayable('#ffffff')` returns false due to float precision. Use RGB epsilon check.
- `Math.round()` on tiny negatives → `-0`. Normalize with `|| 0`.
- Input/output uses `OklchColor` (our type), internal culori calls use `Oklch` (culori type with `mode: 'oklch'`).

**Step 5: Run tests to verify they pass**

Run: `cd packages/core && npx vitest run`
Expected: All PASS

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): OKLCH color math module with tests

parseColor, toColor, formatOklchCss, toHex, clampToSrgb, isInGamut, hueDifference.
Includes epsilon fix for culori displayable() bug on white."
```

---

### Task 2: Contrast module (WCAG 2.2 + APCA)

**Files:**
- Modify: `packages/core/src/contrast.ts`
- Create: `packages/core/src/__tests__/contrast.test.ts`

**Step 1: Write failing tests**

```typescript
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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement contrast.ts**

Key functions:
- `wcagRatio(fg: OklchColor, bg: OklchColor): number` — uses culori's `wcagContrast`
- `apcaLc(textColor: OklchColor, bgColor: OklchColor): number` — signed Lc via apca-w3
- `checkContrast(fg: OklchColor, bg: OklchColor): ContrastResult` — combined check
- `AA_THRESHOLDS` constant

**Gotcha:** `sRGBtoY()` expects 0-255 integers. Convert via `Math.round(channel * 255)`.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): WCAG 2.2 + APCA contrast module with tests"
```

---

### Task 3: Perceptual distance module

**Files:**
- Modify: `packages/core/src/distance.ts`
- Create: `packages/core/src/__tests__/distance.test.ts`

**Step 1: Write failing tests**

```typescript
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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement distance.ts**

Uses culori's `differenceEuclidean('oklch')` for deltaE. `oklchComponents` decomposes into absolute L/C/H deltas.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): perceptual distance module (deltaEOK, oklchComponents)"
```

---

### Task 4: Ramp generation

**Files:**
- Modify: `packages/core/src/ramp.ts`
- Create: `packages/core/src/__tests__/ramp.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateRamp } from '../ramp.js';
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
    const ramp = generateRamp('slate-blue', { baseColor: '#2c4c60', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    expect(ramp.stops).toHaveLength(11);
  });

  it('stop IDs match definitions', () => {
    const ramp = generateRamp('test', { baseColor: '#ff0000', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    expect(ramp.stops.map(s => s.id)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
  });

  it('lightness decreases monotonically', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    for (let i = 1; i < ramp.stops.length; i++) {
      expect(ramp.stops[i].color.oklch.l).toBeLessThan(ramp.stops[i - 1].color.oklch.l);
    }
  });

  it('all stops are in sRGB gamut', () => {
    const ramp = generateRamp('test', { baseColor: 'oklch(60% 0.3 150)', chromaCurve: 'natural', hueShift: 0 }, STOPS);
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
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const stop50 = ramp.stops[0];
    const stop500 = ramp.stops[5];
    const stop950 = ramp.stops[10];
    expect(stop500.color.oklch.c).toBeGreaterThan(stop50.color.oklch.c);
    expect(stop500.color.oklch.c).toBeGreaterThan(stop950.color.oklch.c);
  });

  it('flat curve has uniform chroma (before gamut clamp)', () => {
    const ramp = generateRamp('test', { baseColor: '#666666', chromaCurve: 'flat', hueShift: 0 }, STOPS);
    // Flat curve on a low-chroma input: all stops should have similar chroma
    const chromas = ramp.stops.map(s => s.color.oklch.c);
    const maxC = Math.max(...chromas);
    const minC = Math.min(...chromas);
    expect(maxC - minC).toBeLessThan(0.02); // Nearly uniform for low-chroma input
  });

  it('applies hue shift across lightness range', () => {
    const ramp = generateRamp('test', { baseColor: 'oklch(50% 0.15 200)', chromaCurve: 'natural', hueShift: 20 }, STOPS);
    const lightest = ramp.stops[0].color.oklch.h;
    const darkest = ramp.stops[10].color.oklch.h;
    // Hue should shift across the range (lightest and darkest should differ)
    expect(Math.abs(darkest - lightest)).toBeGreaterThan(5);
  });

  it('achromatic input forces hue to 0', () => {
    const ramp = generateRamp('neutral', { baseColor: '#808080', chromaCurve: 'flat', hueShift: 0 }, STOPS);
    for (const stop of ramp.stops) {
      expect(stop.color.oklch.h).toBe(0);
    }
  });

  it('stops are not overridden by default', () => {
    const ramp = generateRamp('test', { baseColor: '#ff0000', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    for (const stop of ramp.stops) {
      expect(stop.overridden).toBe(false);
    }
  });

  it('finds closest base stop', () => {
    // #2c4c60 has L ~0.38, closest to stop 800 (L=0.37)
    const ramp = generateRamp('test', { baseColor: '#2c4c60', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    expect(ramp.baseStopId).toBe(800);
  });

  it('applies baseLightness override at base stop', () => {
    const ramp = generateRamp('test', {
      baseColor: 'oklch(66% 0.19 30)', // Tomato-like
      chromaCurve: 'natural',
      hueShift: 0,
      baseLightness: 0.59,
    }, STOPS);
    const baseStop = ramp.stops.find(s => s.id === ramp.baseStopId);
    expect(baseStop!.color.oklch.l).toBeCloseTo(0.59, 1);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement ramp.ts**

Key function: `generateRamp(name: string, params: RampParams, stops: StopDefinition[]): Ramp`

Reference: `~/GitHub/collabrios/src/commands/generate-ramp.ts`

Algorithm:
1. Parse base color to OKLCH, extract base chroma and hue
2. Find closest stop by lightness → `baseStopId`
3. For each stop definition:
   - Use the stop's lightness target (or `baseLightness` if this is the base stop and override set)
   - Scale chroma by curve factor × base chroma
   - Apply hue shift via linear interpolation
   - Gamut clamp (reduce chroma, preserve lightness)
   - Convert to `Color` (oklch + hex + rgb)
4. Return `Ramp` with `overridden: false` on all stops

Chroma scales (from Collabrios `generate-ramp.ts`):
- `natural`: bell curve `[0.08, 0.20, 0.45, 0.75, 0.93, 1.00, 0.96, 0.85, 0.70, 0.50, 0.30]`
- `linear`: `[0.10, 0.28, 0.46, 0.64, 0.82, 1.00, 0.91, 0.82, 0.73, 0.55, 0.36]`
- `flat`: all `1.00`

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): ramp generation with three chroma curves and hue shift"
```

---

### Task 5: Per-stop overrides

**Files:**
- Modify: `packages/core/src/overrides.ts`
- Create: `packages/core/src/__tests__/overrides.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { applyOverride, clearOverride, clearAllOverrides } from '../overrides.js';
import { generateRamp } from '../ramp.js';
import type { StopDefinition } from '../types.js';

const STOPS: StopDefinition[] = [
  { id: 50, label: '50', lightness: 0.985 },
  { id: 500, label: '500', lightness: 0.62 },
  { id: 950, label: '950', lightness: 0.17 },
];

describe('applyOverride', () => {
  it('overrides lightness at a specific stop', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const updated = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    const stop500 = updated.stops.find(s => s.id === 500)!;
    expect(stop500.color.oklch.l).toBeCloseTo(0.59, 1);
    expect(stop500.overridden).toBe(true);
    expect(stop500.overrides).toEqual({ l: 0.59 });
  });

  it('does not affect other stops', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const updated = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    expect(updated.stops.find(s => s.id === 50)!.overridden).toBe(false);
    expect(updated.stops.find(s => s.id === 950)!.overridden).toBe(false);
  });

  it('preserves overrides when ramp params change', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const overridden = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    // Simulate regen with new params — overrides should survive
    const regenerated = applyOverride(
      generateRamp('test', { baseColor: '#cc3366', chromaCurve: 'natural', hueShift: 0 }, STOPS),
      500,
      overridden.stops.find(s => s.id === 500)!.overrides!,
      STOPS,
    );
    expect(regenerated.stops.find(s => s.id === 500)!.color.oklch.l).toBeCloseTo(0.59, 1);
  });
});

describe('clearOverride', () => {
  it('removes override and regenerates stop algorithmically', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const overridden = applyOverride(ramp, 500, { l: 0.59 }, STOPS);
    const cleared = clearOverride(overridden, 500, STOPS);
    const stop500 = cleared.stops.find(s => s.id === 500)!;
    expect(stop500.overridden).toBe(false);
    expect(stop500.overrides).toBeUndefined();
    // Should snap back to algorithmic lightness (0.62)
    expect(stop500.color.oklch.l).toBeCloseTo(0.62, 1);
  });
});

describe('clearAllOverrides', () => {
  it('clears all overrides', () => {
    const ramp = generateRamp('test', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    let updated = applyOverride(ramp, 50, { l: 0.99 }, STOPS);
    updated = applyOverride(updated, 500, { l: 0.59 }, STOPS);
    const cleared = clearAllOverrides(updated, STOPS);
    for (const stop of cleared.stops) {
      expect(stop.overridden).toBe(false);
    }
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement overrides.ts**

Key functions:
- `applyOverride(ramp: Ramp, stopId: number, overrides: Partial<OklchColor>, stops: StopDefinition[]): Ramp` — returns new Ramp with the override applied. Recalculates the affected stop using overridden values for specified components and algorithmic values for the rest.
- `clearOverride(ramp: Ramp, stopId: number, stops: StopDefinition[]): Ramp` — regenerates the stop algorithmically
- `clearAllOverrides(ramp: Ramp, stops: StopDefinition[]): Ramp` — clears all overrides

All functions are immutable — they return new Ramp objects.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): per-stop override system (apply, clear, clearAll)"
```

---

### Task 6: Token resolver + audit

**Files:**
- Modify: `packages/core/src/tokens.ts`
- Modify: `packages/core/src/resolver.ts`
- Modify: `packages/core/src/audit.ts`
- Create: `packages/core/src/__tests__/resolver.test.ts`
- Create: `packages/core/src/__tests__/audit.test.ts`

**Step 1: Write failing resolver tests**

```typescript
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
```

**Step 2: Write failing audit tests**

```typescript
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
```

**Step 3: Run tests — expect FAIL**

**Step 4: Implement tokens.ts, resolver.ts, audit.ts**

`tokens.ts` — helper functions for creating and validating token definitions
`resolver.ts` — `resolveTokens(tokens: TokenDefinition[], ramps: Ramp[]): ResolvedToken[]`
`audit.ts` — `auditTokenPairs(resolved: ResolvedToken[], pairs: TokenPairDefinition[]): AuditReport`

Reference: `~/GitHub/collabrios/src/lib/token-resolver.ts`

**Step 5: Run tests — expect PASS**

**Step 6: Commit**

```bash
git commit -m "feat(core): token resolver and contrast audit engine"
```

---

### Task 7: CSS import

**Files:**
- Modify: `packages/core/src/import-css.ts`
- Create: `packages/core/src/__tests__/import-css.test.ts`

**Step 1: Write failing tests**

```typescript
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
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement import-css.ts**

`importCSS(css: string): CSSImportResult`

Parser logic:
1. Extract `@theme { ... }` blocks — parse `--color-{name}-{stop}: <value>` into ramp structures
2. Extract `:root { ... }` blocks — parse `--{token}: <value>` into light token map
3. Extract `.dark { ... }` blocks — same for dark tokens
4. Resolve `var()` references against the parsed primitives
5. Group primitives by ramp name, construct `Ramp` objects

This is a text parser, not a full CSS parser. Regex-based is fine for `@theme` / `:root` / `.dark` blocks with CSS custom property declarations.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): CSS import — parse @theme, :root, .dark blocks"
```

---

### Task 8: Figma JSON import

**Files:**
- Modify: `packages/core/src/import-figma.ts`
- Create: `packages/core/src/__tests__/import-figma.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { importFigmaJSON } from '../import-figma.js';

const PRIMITIVES_JSON = {
  "color/blue/50": {
    "$type": "color",
    "$value": { "colorSpace": "srgb", "components": [0.92, 0.95, 1.0], "alpha": 1, "hex": "#eaf3ff" },
    "$extensions": {}
  },
  "color/blue/500": {
    "$type": "color",
    "$value": { "colorSpace": "srgb", "components": [0.2, 0.4, 0.8], "alpha": 1, "hex": "#3366cc" },
    "$extensions": {}
  },
};

const LIGHT_JSON = {
  "primary": {
    "$type": "color",
    "$value": { "colorSpace": "srgb", "components": [0.2, 0.3, 0.4], "alpha": 1, "hex": "#334d66" },
    "$extensions": {
      "com.figma.aliasData": {
        "targetVariableName": "color/blue/800",
        "targetVariableSetName": "Primitives"
      }
    }
  },
};

describe('importFigmaJSON', () => {
  it('parses primitives into ramp structures', () => {
    const result = importFigmaJSON({ primitives: PRIMITIVES_JSON, light: LIGHT_JSON, dark: LIGHT_JSON });
    const blueRamp = result.ramps.find(r => r.name === 'blue');
    expect(blueRamp).toBeDefined();
  });

  it('extracts semantic tokens from light/dark', () => {
    const result = importFigmaJSON({ primitives: PRIMITIVES_JSON, light: LIGHT_JSON, dark: LIGHT_JSON });
    expect(result.tokens.light['--primary']).toBeDefined();
  });

  it('resolves alias data to source references', () => {
    const result = importFigmaJSON({ primitives: PRIMITIVES_JSON, light: LIGHT_JSON, dark: LIGHT_JSON });
    // Alias data should be resolved — the token should carry the source info
    expect(result.tokens.light['--primary']).toBeDefined();
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement import-figma.ts**

`importFigmaJSON(input: { primitives?: object, light: object, dark: object }): FigmaImportResult`

Reference: `~/GitHub/collabrios/src/commands/import-figma.ts`

Parser logic:
1. Parse primitives JSON — group by ramp name (strip `color/` prefix, split on `/`)
2. Convert sRGB 0-1 components to OKLCH via culori
3. Parse light/dark semantic JSONs — extract token names, resolve aliases
4. Construct Ramp objects and token maps

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): Figma W3C Design Tokens JSON import"
```

---

### Task 9: CSS export (three-layer)

**Files:**
- Modify: `packages/core/src/export-css.ts`
- Create: `packages/core/src/__tests__/export-css.test.ts`

**Step 1: Write failing tests**

```typescript
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
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const css = exportPrimitivesCSS([ramp]);
    expect(css).toContain('@theme');
    expect(css).toContain('--color-blue-50');
    expect(css).toContain('--color-blue-500');
    expect(css).toContain('--color-blue-950');
    expect(css).toContain('oklch(');
  });
});

describe('exportSemanticCSS', () => {
  it('emits :root and .dark blocks', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
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
});

describe('exportTailwindMappingCSS', () => {
  it('emits @theme inline block', () => {
    const tokens = ['--primary', '--background'];
    const css = exportTailwindMappingCSS(tokens);
    expect(css).toContain('@theme inline');
    expect(css).toContain('--primary');
    expect(css).toContain('--background');
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement export-css.ts**

Three export functions:
- `exportPrimitivesCSS(ramps: Ramp[]): string` — Layer 1: `@theme { --color-{name}-{stop}: oklch(...) }`
- `exportSemanticCSS(resolved: ResolvedToken[], tokens: TokenDefinition[]): string` — Layer 2: `:root { ... }` + `.dark { ... }` with `var()` refs for ramp sources, inline OKLCH for literals
- `exportTailwindMappingCSS(tokenNames: string[]): string` — Layer 3: `@theme inline { --{name}: var(--{name}) }`

Reference: `~/GitHub/collabrios/src/lib/format.ts`

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): three-layer CSS export (primitives, semantic, Tailwind)"
```

---

### Task 10: Figma JSON export

**Files:**
- Modify: `packages/core/src/export-figma.ts`
- Create: `packages/core/src/__tests__/export-figma.test.ts`

**Step 1: Write failing tests**

```typescript
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
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
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
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const output = exportFigmaJSON([ramp], resolved, tokens);
    expect(output.semantic.variables[0].light).toEqual({ type: 'alias', name: 'color/blue/500' });
  });

  it('includes codeSyntax when enabled', () => {
    const ramp = generateRamp('blue', { baseColor: '#3366cc', chromaCurve: 'natural', hueShift: 0 }, STOPS);
    const tokens: TokenDefinition[] = [
      { name: '--primary', light: { type: 'ramp', ramp: 'blue', stop: 500 }, dark: { type: 'ramp', ramp: 'blue', stop: 50 } },
    ];
    const resolved = resolveTokens(tokens, [ramp]);
    const output = exportFigmaJSON([ramp], resolved, tokens, { includeCodeSyntax: true });
    expect(output.primitives.variables[0].codeSyntax?.WEB).toBeDefined();
    expect(output.semantic.variables[0].codeSyntax?.WEB).toBe('--primary');
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement export-figma.ts**

`exportFigmaJSON(ramps, resolved, tokens, options?): FigmaVariableExport`

Reference: `~/GitHub/collabrios/src/commands/export-figma.ts`

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git commit -m "feat(core): Figma variable JSON export with alias support"
```

---

### Task 11: Preset system + JSON export + barrel export

**Files:**
- Modify: `packages/core/src/preset.ts`
- Modify: `packages/core/src/export-json.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Implement preset.ts**

```typescript
import type { Preset, StopDefinition } from './types.js';

/** Validate a preset has required fields */
export function validatePreset(preset: Preset): void {
  if (!preset.name) throw new Error('Preset must have a name');
  if (!preset.stops.length) throw new Error('Preset must define at least one stop');
  if (!preset.tokenSchema.tokens.length) throw new Error('Preset must define at least one token');
}

/** Get stop definitions from a preset */
export function getStops(preset: Preset): StopDefinition[] {
  return preset.stops;
}
```

**Step 2: Implement export-json.ts**

```typescript
import type { Ramp, ResolvedToken } from './types.js';

/** Export ramps as JSON */
export function exportRampJSON(ramp: Ramp): string {
  return JSON.stringify(ramp, null, 2);
}

/** Export resolved tokens as JSON */
export function exportTokensJSON(tokens: ResolvedToken[]): string {
  return JSON.stringify(tokens, null, 2);
}
```

**Step 3: Clean up index.ts barrel exports**

Ensure all public APIs are re-exported. Remove any stub modules that weren't implemented (simulate.ts deferred to v0.2 — export an empty placeholder with a TODO).

**Step 4: Run full test suite**

Run: `cd packages/core && npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git commit -m "feat(core): preset system, JSON export, clean barrel exports"
```

---

## Phase 2: Webapp

### Task 12: Webapp scaffold (Vite + React + Tailwind)

**Files:**
- Create: `packages/webapp/index.html`
- Create: `packages/webapp/src/main.tsx`
- Create: `packages/webapp/src/App.tsx`
- Create: `packages/webapp/src/app.css`
- Create: `packages/webapp/vite.config.ts`

**Step 1: Set up Vite config**

```typescript
// packages/webapp/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

**Step 2: Create entry point**

Create `packages/webapp/index.html` (standard Vite entry), `src/main.tsx` (React root), `src/App.tsx` (shell component with three-panel layout placeholder), `src/app.css` (Tailwind imports).

**Step 3: Verify dev server starts**

Run: `cd packages/webapp && npm install && npm run dev`
Expected: Dev server starts, shows placeholder UI

**Step 4: Commit**

```bash
git commit -m "feat(webapp): Vite + React + Tailwind scaffold"
```

---

### Task 13: State management — project store

**Files:**
- Create: `packages/webapp/src/store.ts`
- Create: `packages/webapp/src/types.ts`

**Step 1: Design the project state**

The webapp state = one "project" containing:
- `ramps: Ramp[]` — all loaded color ramps
- `selectedRampIndex: number` — which ramp is being edited
- `tokenMapping: TokenDefinition[]` — semantic token assignments
- `preset: Preset` — active preset (shadcn by default)
- `mode: 'light' | 'dark'` — preview mode toggle
- Derived: `resolvedTokens`, `auditReport` (recomputed on every change)

Use React `useReducer` + context. No external state library — the state shape is simple and everything derives from ramps + token mapping.

**Step 2: Implement store with reducer**

Actions:
- `SET_RAMPS` — replace all ramps (import)
- `ADD_RAMP` — add a new ramp
- `REMOVE_RAMP` — remove a ramp
- `SELECT_RAMP` — select ramp for editing
- `UPDATE_RAMP_PARAMS` — change base color, curve, hue shift → regenerate
- `OVERRIDE_STOP` — pin a stop value
- `CLEAR_OVERRIDE` — clear a stop override
- `SET_TOKEN_SOURCE` — change a token's ramp/stop assignment
- `SET_TOKEN_MAPPING` — replace all token mappings (import)
- `SET_PRESET` — switch preset
- `TOGGLE_MODE` — light/dark toggle

All derived state (resolved tokens, audit report) recomputed via `useMemo` in the provider.

**Step 3: Commit**

```bash
git commit -m "feat(webapp): project state store with reducer + context"
```

---

### Task 14: Ramp Editor panel

**Files:**
- Create: `packages/webapp/src/components/RampEditor.tsx`
- Create: `packages/webapp/src/components/ColorPicker.tsx`
- Create: `packages/webapp/src/components/StopStrip.tsx`
- Create: `packages/webapp/src/components/ParamSliders.tsx`

**Step 1: Build RampEditor component**

The left panel. Contains:
- `ColorPicker` — hex input + visual color well for base color
- `ParamSliders` — chroma curve selector (natural/linear/flat), hue shift slider (0-30), base lightness slider
- `StopStrip` — vertical strip of 11 stop swatches. Each shows: color swatch, hex, L/C/H values. Click to select. Override badge if pinned. Click badge to clear.

When a stop is selected, show L/C/H sliders for override editing.

All changes dispatch to the store → ramp regenerates → everything updates.

**Step 2: Verify interactive editing works**

Run dev server, change base color → ramp updates live. Change curve → ramp regenerates. Click stop → override sliders appear.

**Step 3: Commit**

```bash
git commit -m "feat(webapp): ramp editor panel with color picker, sliders, stop strip"
```

---

### Task 15: Ramp Overview strip

**Files:**
- Create: `packages/webapp/src/components/RampOverview.tsx`

**Step 1: Build RampOverview component**

Bottom strip showing all loaded ramps as compact horizontal rows. Each row:
- Ramp name label
- 11 color swatches in a row
- Click to select for editing (highlights, sets `selectedRampIndex`)
- `+` button to add new ramp (opens base color input)
- `x` button to remove ramp
- Dim indicator if ramp is not referenced by any token

**Step 2: Commit**

```bash
git commit -m "feat(webapp): ramp overview strip with add/remove"
```

---

### Task 16: Token Map panel

**Files:**
- Create: `packages/webapp/src/components/TokenMap.tsx`
- Create: `packages/webapp/src/components/TokenRow.tsx`

**Step 1: Build TokenMap component**

The center panel. Lists all semantic tokens from the active preset. Each `TokenRow` shows:
- Token name (e.g., `--primary`)
- Light mode swatch + dark mode swatch side by side
- Source label (e.g., "blue-800") — clickable to jump to that ramp/stop in the editor
- Dropdown to reassign: lists all ramp-stop combinations + "literal" option with color input
- Changes dispatch `SET_TOKEN_SOURCE` to the store

Group tokens by category (Core, Status, Subtle, Border, Chart, Sidebar, Brand, Table).

Light/dark mode toggle at the top of the panel.

**Step 2: Commit**

```bash
git commit -m "feat(webapp): token map panel with source assignment"
```

---

### Task 17: Audit Panel

**Files:**
- Create: `packages/webapp/src/components/AuditPanel.tsx`
- Create: `packages/webapp/src/components/ContrastPair.tsx`

**Step 1: Build AuditPanel component**

The right panel. Shows all fg/bg pairs from the preset's `tokenSchema.pairs`. Each `ContrastPair` shows:
- Pair name (e.g., "primary")
- Foreground swatch over background swatch (visual preview)
- WCAG ratio (e.g., "9.09:1")
- APCA Lc (e.g., "Lc 78.2")
- Pass/fail badge (green check / red X)
- Light and dark mode results side by side
- Click to highlight both tokens in Token Map panel

Summary bar at top: "14/15 pass" with overall status.

**Step 2: Commit**

```bash
git commit -m "feat(webapp): audit panel with live contrast checking"
```

---

### Task 18: Import flow

**Files:**
- Create: `packages/webapp/src/components/ImportModal.tsx`

**Step 1: Build ImportModal component**

Toolbar "Import" button opens a modal with:
- File picker (accepts `.css`, `.json`)
- Paste area (for pasting CSS or JSON directly)
- Auto-detect format:
  - If it contains `@theme` or `:root` → CSS import
  - If it contains `$type` or `colorSpace` → Figma JSON import
  - If it's a hex string or comma-separated hexes → raw color import (create individual ramps)
- Preview of what will be imported (ramp count, token count)
- "Import" button → dispatches `SET_RAMPS` + `SET_TOKEN_MAPPING` to the store

Uses `@huelab/core`'s `importCSS()` and `importFigmaJSON()`.

**Step 2: Commit**

```bash
git commit -m "feat(webapp): import modal with CSS + Figma JSON auto-detection"
```

---

### Task 19: Export flow

**Files:**
- Create: `packages/webapp/src/components/ExportModal.tsx`

**Step 1: Build ExportModal component**

Toolbar "Export" button opens a modal with:
- Format selector: CSS (three-layer), Figma JSON, Raw JSON
- Preview pane showing the generated output
- "Copy to clipboard" button
- "Download" button (uses `URL.createObjectURL` + `<a download>`)

For CSS, generates all three layers concatenated with section headers.
For Figma, generates the full `FigmaVariableExport` JSON.
For Raw JSON, exports ramps + tokens.

Uses `@huelab/core`'s export functions.

**Step 2: Commit**

```bash
git commit -m "feat(webapp): export modal with CSS, Figma JSON, and raw JSON"
```

---

### Task 20: Integration + polish

**Files:**
- Modify: `packages/webapp/src/App.tsx`

**Step 1: Wire up the three-panel layout**

Integrate all panels into `App.tsx` with the final layout:
- Toolbar at top (Import, Export, Preset selector)
- Three resizable panels (RampEditor, TokenMap, AuditPanel)
- RampOverview strip at bottom
- Responsive: panels stack vertically on narrow screens

**Step 2: Add preset selector**

Dropdown in toolbar. Loads `shadcnPreset` by default. Changing preset resets token mapping to the preset's defaults.

**Step 3: End-to-end test**

Manual verification:
1. Load app → shadcn preset active, no ramps loaded
2. Click `+` to add a ramp → enters base color → ramp generates → appears in editor and overview
3. Adjust sliders → ramp updates live
4. Assign token to ramp stop → token map updates, audit recalculates
5. Override a stop → badge appears, audit updates
6. Import CSS → ramps + tokens populate
7. Export CSS → valid three-layer CSS downloads

**Step 4: Commit**

```bash
git commit -m "feat(webapp): integrate panels, preset selector, end-to-end flow"
```

---

## Phase 3: Package + Ship

### Task 21: Package cleanup + publish prep

**Files:**
- Create: `packages/core/README.md`
- Create: `LICENSE` (root)
- Modify: `package.json` (root)

**Step 1: Add MIT license**

**Step 2: Write core README**

Brief description, install instructions, basic usage examples (generate a ramp, check contrast, export CSS).

**Step 3: Verify build**

Run: `npm run build` (root)
Expected: All three packages build without errors

**Step 4: Commit + tag**

```bash
git commit -m "chore: package cleanup, license, README"
git tag v0.1.0
```

---

## Dependency Graph

```
Task 1 (oklch) ──→ Task 2 (contrast) ──→ Task 6 (resolver + audit)
                ──→ Task 3 (distance)
                ──→ Task 4 (ramp) ──→ Task 5 (overrides) ──→ Task 6
Task 6 ──→ Task 7 (CSS import)
       ──→ Task 8 (Figma import)
       ──→ Task 9 (CSS export)
       ──→ Task 10 (Figma export)
       ──→ Task 11 (preset + JSON export)
Tasks 1-11 ──→ Task 12 (webapp scaffold) ──→ Task 13 (store)
Task 13 ──→ Task 14 (ramp editor)
        ──→ Task 15 (ramp overview)
        ──→ Task 16 (token map)
        ──→ Task 17 (audit panel)
Tasks 14-17 ──→ Task 18 (import)
            ──→ Task 19 (export)
            ──→ Task 20 (integration)
Task 20 ──→ Task 21 (ship)
```

**Parallelizable groups:**
- Tasks 2, 3, 4 can run in parallel (all depend only on Task 1)
- Tasks 7, 8, 9, 10 can run in parallel (all depend on Task 6)
- Tasks 14, 15, 16, 17 can run in parallel (all depend on Task 13)
- Tasks 18, 19 can run in parallel (both depend on Tasks 14-17)
