# @huelab/core

Accessible color system toolkit for TypeScript. Generate OKLCH color ramps, check WCAG 2.2 and APCA contrast, map semantic tokens, audit accessibility, and export to CSS or Figma.

Pure functions, zero DOM dependencies, immutable data in and out.

## Install

```bash
npm install @huelab/core
```

## Usage

### Generate a color ramp

Create an 11-stop OKLCH ramp from a base color:

```ts
import { generateRamp } from '@huelab/core';

const stops = [
  { id: 50,  label: '50',  lightness: 0.985 },
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

const ramp = generateRamp('blue', { baseColor: '#2563eb' }, stops, 'natural');

// ramp.stops[0].color.hex  → "#fefeff"
// ramp.stops[5].color.hex  → a mid-lightness blue

// Enable automatic hue shift (warm darks, cool lights)
const shifted = generateRamp('blue', { baseColor: '#2563eb' }, stops, 'natural', true);

// Preview what the base color looks like at its closest stop
import { computeBaseStopHex } from '@huelab/core';
const hex = computeBaseStopHex('#2563eb', stops, 'natural'); // → "#4568e8"
```

### Check contrast

Compute WCAG 2.2 ratio and APCA Lc between two colors:

```ts
import { parseColor, checkContrast } from '@huelab/core';

const fg = parseColor('#1e293b')!;
const bg = parseColor('#ffffff')!;

const result = checkContrast(fg, bg);

result.wcagRatio;            // e.g. 14.53
result.apcaLc;               // e.g. 97.2 (positive = dark on light)
result.passesAA.normalText;  // true (>= 4.5:1)
result.passesAA.largeText;   // true (>= 3:1)
```

### Export CSS

Emit three-layer CSS: primitives, semantic tokens, and Tailwind mapping.

```ts
import { exportPrimitivesCSS, exportSemanticCSS, exportTailwindMappingCSS } from '@huelab/core';

// Layer 1 — OKLCH primitive variables
const primitivesCSS = exportPrimitivesCSS([ramp]);
// @theme {
//   --color-blue-50: oklch(99% 0.01 264);
//   --color-blue-500: oklch(62% 0.15 264);
//   ...
// }

// Layer 2 — Semantic tokens (:root / .dark)
const semanticCSS = exportSemanticCSS(resolvedTokens, tokenDefinitions);
// :root { --primary: var(--color-blue-800); }
// .dark { --primary: var(--color-blue-300); }

// Layer 3 — Tailwind mapping
const tailwindCSS = exportTailwindMappingCSS(['--primary', '--background']);
// @theme inline { --primary: var(--primary); }
```

### Audit token pairs

Check foreground/background pairs against WCAG 2.2 AA thresholds:

```ts
import { resolveTokens, auditTokenPairs } from '@huelab/core';

const resolved = resolveTokens(tokenDefinitions, [ramp]);
const report = auditTokenPairs(resolved, pairDefinitions);

report.summary.totalPairs;  // number of pairs checked
report.summary.failures;    // pairs that fail in light or dark mode
```

## API Overview

| Module | Key exports |
|--------|------------|
| `oklch` | `parseColor`, `toColor`, `toHex`, `clampToSrgb`, `formatOklchCss`, `isInGamut`, `hueDifference` |
| `contrast` | `checkContrast`, `wcagRatio`, `apcaLc`, `AA_THRESHOLDS` |
| `distance` | `deltaEOK`, `oklchComponents` |
| `ramp` | `generateRamp`, `computeBaseStopHex`, `AUTO_HUE_SHIFT_DEGREES` |
| `overrides` | `applyOverride`, `clearOverride`, `clearAllOverrides` |
| `tokens` | `rampSource`, `literalSource` |
| `resolver` | `resolveTokens` |
| `audit` | `auditTokenPairs` |
| `export-css` | `exportPrimitivesCSS`, `exportSemanticCSS`, `exportTailwindMappingCSS` |
| `export-figma` | `exportFigmaJSON` |
| `export-json` | `exportRampJSON`, `exportTokensJSON` |
| `import-css` | `importCSS` |
| `import-figma` | `importFigmaJSON` |
| `preset` | `validatePreset`, `getStops` |
| `types` | `OklchColor`, `Color`, `Ramp`, `RampParams`, `RampStop`, `StopDefinition`, `ChromaCurve`, `ContrastResult`, `TokenDefinition`, `TokenPairDefinition`, `ResolvedToken`, `AuditReport`, `Preset`, ... |

### Key types

- **`ChromaCurve`** — `'natural' | 'linear' | 'flat'` — chroma distribution curve for ramp generation
- **`RampParams`** — `{ baseColor: string }` — simplified ramp parameters (chroma curve and hue shift are now separate arguments to `generateRamp`)
- **`generateRamp(name, params, stops, chromaCurve?, autoHueShift?)`** — generates an 11-stop OKLCH ramp. `chromaCurve` defaults to `'natural'`, `autoHueShift` defaults to `false`.
- **`computeBaseStopHex(baseColor, stops, chromaCurve)`** — returns the hex color of the base stop after algorithm processing (lightness target + chroma curve)
- **`AUTO_HUE_SHIFT_DEGREES`** — default hue shift amount (10 degrees) when `autoHueShift` is enabled

## License

MIT
