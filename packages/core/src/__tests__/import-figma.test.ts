import { describe, it, expect } from 'vitest';
import { importFigmaJSON } from '../import-figma.js';

// ---------------------------------------------------------------------------
// Test fixtures — W3C Design Tokens JSON format as exported by Figma
// ---------------------------------------------------------------------------

const PRIMITIVES_JSON = {
  "color/blue/50": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.92, 0.95, 1.0],
      "alpha": 1,
      "hex": "#eaf3ff",
    },
    "$extensions": {},
  },
  "color/blue/500": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.2, 0.4, 0.8],
      "alpha": 1,
      "hex": "#3366cc",
    },
    "$extensions": {},
  },
  "color/blue/900": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.05, 0.1, 0.3],
      "alpha": 1,
      "hex": "#0d1a4d",
    },
    "$extensions": {},
  },
  "color/gray/100": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.95, 0.95, 0.95],
      "alpha": 1,
      "hex": "#f2f2f2",
    },
    "$extensions": {},
  },
  "color/gray/800": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.2, 0.2, 0.2],
      "alpha": 1,
      "hex": "#333333",
    },
    "$extensions": {},
  },
  "color/base/white": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [1.0, 1.0, 1.0],
      "alpha": 1,
      "hex": "#ffffff",
    },
    "$extensions": {},
  },
};

const LIGHT_JSON = {
  "primary": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.2, 0.4, 0.8],
      "alpha": 1,
      "hex": "#3366cc",
    },
    "$extensions": {
      "com.figma.aliasData": {
        "targetVariableName": "color/blue/500",
        "targetVariableSetName": "Primitives",
      },
    },
  },
  "background": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [1.0, 1.0, 1.0],
      "alpha": 1,
      "hex": "#ffffff",
    },
    "$extensions": {
      "com.figma.aliasData": {
        "targetVariableName": "color/base/white",
        "targetVariableSetName": "Primitives",
      },
    },
  },
  "muted": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.95, 0.95, 0.95],
      "alpha": 1,
      "hex": "#f2f2f2",
    },
    "$extensions": {},
  },
};

const DARK_JSON = {
  "primary": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.92, 0.95, 1.0],
      "alpha": 1,
      "hex": "#eaf3ff",
    },
    "$extensions": {
      "com.figma.aliasData": {
        "targetVariableName": "color/blue/50",
        "targetVariableSetName": "Primitives",
      },
    },
  },
  "background": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.05, 0.1, 0.3],
      "alpha": 1,
      "hex": "#0d1a4d",
    },
    "$extensions": {
      "com.figma.aliasData": {
        "targetVariableName": "color/blue/900",
        "targetVariableSetName": "Primitives",
      },
    },
  },
  "muted": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0.2, 0.2, 0.2],
      "alpha": 1,
      "hex": "#333333",
    },
    "$extensions": {},
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('importFigmaJSON', () => {
  describe('primitives parsing', () => {
    it('parses primitives into ramp structures grouped by name', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const blueRamp = result.ramps.find((r) => r.name === 'blue');
      expect(blueRamp).toBeDefined();
      expect(blueRamp!.stops.length).toBe(3); // 50, 500, 900
    });

    it('extracts multiple ramps from primitives', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const rampNames = result.ramps.map((r) => r.name).sort();
      // "base" group contains "white" which is not a numeric stop — may or may not be a ramp
      // "blue" and "gray" should always be present
      expect(rampNames).toContain('blue');
      expect(rampNames).toContain('gray');
    });

    it('sorts stops by numeric ID within each ramp', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const blueRamp = result.ramps.find((r) => r.name === 'blue')!;
      const stopIds = blueRamp.stops.map((s) => s.id);
      expect(stopIds).toEqual([50, 500, 900]);
    });

    it('converts sRGB 0-1 components to hex values', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const blueRamp = result.ramps.find((r) => r.name === 'blue')!;
      const stop500 = blueRamp.stops.find((s) => s.id === 500)!;
      expect(stop500.color.hex).toBe('#3366cc');
    });

    it('populates OKLCH values for each stop', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const blueRamp = result.ramps.find((r) => r.name === 'blue')!;
      const stop500 = blueRamp.stops.find((s) => s.id === 500)!;
      // OKLCH lightness should be between 0 and 1
      expect(stop500.color.oklch.l).toBeGreaterThan(0);
      expect(stop500.color.oklch.l).toBeLessThan(1);
      // Chroma should be positive for a blue color
      expect(stop500.color.oklch.c).toBeGreaterThan(0);
    });

    it('populates RGB 0-255 values for each stop', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const blueRamp = result.ramps.find((r) => r.name === 'blue')!;
      const stop500 = blueRamp.stops.find((s) => s.id === 500)!;
      expect(stop500.color.rgb.r).toBe(51);
      expect(stop500.color.rgb.g).toBe(102);
      expect(stop500.color.rgb.b).toBe(204);
    });

    it('marks stops as not overridden (imported, not manually pinned)', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      const blueRamp = result.ramps.find((r) => r.name === 'blue')!;
      blueRamp.stops.forEach((stop) => {
        expect(stop.overridden).toBe(false);
      });
    });
  });

  describe('semantic token extraction', () => {
    it('extracts light mode tokens prefixed with --', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      expect(result.tokens.light['--primary']).toBeDefined();
      expect(result.tokens.light['--background']).toBeDefined();
      expect(result.tokens.light['--muted']).toBeDefined();
    });

    it('extracts dark mode tokens prefixed with --', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      expect(result.tokens.dark['--primary']).toBeDefined();
      expect(result.tokens.dark['--background']).toBeDefined();
    });

    it('resolves alias data to ramp references', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      // "primary" in light mode aliases "color/blue/500" → should reference blue-500
      expect(result.tokens.light['--primary']).toBe('blue-500');
    });

    it('resolves dark mode aliases independently', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      // "primary" in dark mode aliases "color/blue/50" → should reference blue-50
      expect(result.tokens.dark['--primary']).toBe('blue-50');
    });

    it('falls back to hex for tokens without alias data', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      // "muted" has no aliasData → should fall back to hex from $value
      expect(result.tokens.light['--muted']).toBe('#f2f2f2');
    });

    it('resolves base primitives in aliases', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      // "background" in light mode aliases "color/base/white"
      expect(result.tokens.light['--background']).toBe('base-white');
    });
  });

  describe('edge cases', () => {
    it('handles empty primitives gracefully', () => {
      const result = importFigmaJSON({
        primitives: {},
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      expect(result.ramps).toEqual([]);
      // Tokens should still be extracted, falling back to hex
      expect(result.tokens.light['--primary']).toBeDefined();
    });

    it('handles undefined primitives', () => {
      const result = importFigmaJSON({
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      expect(result.ramps).toEqual([]);
    });

    it('handles empty light/dark objects', () => {
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: {},
        dark: {},
      });
      expect(result.tokens.light).toEqual({});
      expect(result.tokens.dark).toEqual({});
      expect(result.ramps.length).toBeGreaterThan(0);
    });

    it('skips non-color entries in primitives', () => {
      const withNonColor = {
        ...PRIMITIVES_JSON,
        "spacing/sm": {
          "$type": "dimension",
          "$value": "8px",
          "$extensions": {},
        },
      };
      const result = importFigmaJSON({
        primitives: withNonColor as any,
        light: LIGHT_JSON,
        dark: DARK_JSON,
      });
      // Should not crash, and ramps should still be parsed
      expect(result.ramps.length).toBeGreaterThan(0);
    });

    it('handles primitives with non-numeric stop names gracefully', () => {
      // "color/base/white" has a non-numeric stop ("white")
      // It should still form a ramp named "base"
      const result = importFigmaJSON({
        primitives: PRIMITIVES_JSON,
        light: {},
        dark: {},
      });
      const baseRamp = result.ramps.find((r) => r.name === 'base');
      // base/white — "white" is not numeric, so it gets a default id of 0
      expect(baseRamp).toBeDefined();
    });
  });
});
