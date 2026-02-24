# Technical Reference

Hard-won lessons from the Collabrios Health color system engagement. These are the gotchas, algorithms, and design rationale that should inform the huelab implementation.

## Color Science

### OKLCH as the sole internal color space

Use OKLCH for all internal math. Convert to hex/RGB only at output boundaries (CSS hex values, WCAG relative luminance, Figma RGB). HSL is perceptually non-uniform (50% lightness varies wildly across hues). CIE LCH has less tooling support and Tailwind v4 adopted OKLCH.

### Gamut mapping: reduce chroma, preserve lightness

When an OKLCH color falls outside sRGB, reduce chroma toward the achromatic axis while holding lightness constant. This preserves cross-ramp consistency — every ramp's stop 500 has the same perceived brightness. The alternative (shifting lightness) breaks perceptual uniformity.

Use culori's `clampChroma` in the `oklch` space.

### Fixed lightness targets, not base-color-anchored

Ramp stops use fixed lightness targets (50=0.985 down to 950=0.17) with non-linear distribution weighted toward wider spacing in the 300-700 range. The base color anchors hue and max chroma, but its exact lightness is NOT preserved at any stop.

This creates cross-ramp consistency: every ramp's stop 300 is the same perceived brightness. The tradeoff is that `oklch(40% ...)` input doesn't produce `oklch(40% ...)` at any stop. The ramp is the source of truth, not the input.

### Chroma curves

- **Natural** (bell-shaped, peak at 500): vibrant midtones, naturally muted extremes. Best default.
- **Linear**: smoother than flat but still clips at extremes.
- **Flat**: uniform chroma, gamut clamping reduces at extremes. Use for neutral/achromatic ramps.

### Hue shift

Linear interpolation from `-hueShift/2` at the lightest stop to `+hueShift/2` at the darkest. For achromatic inputs (chroma < 0.001), force hue to 0 to avoid noise.

### Color perception: chroma matters more than hue

Hue proximity does NOT equal visual similarity. Two ramps with similar hues can look very different if their chroma differs significantly. Example: slate-blue (C=0.05) and info-blue (C=0.22) are 4x apart in chroma — they look distinct even when hues are only 3 degrees apart. Never judge visual distinctness by hue angle alone; always consider chroma and lightness together.

### Perceptual distance

Use culori's `differenceEuclidean('oklch')` for deltaE. This handles hue wrapping correctly. A merge risk threshold of deltaE < 0.05 is a good starting point for flagging confusable colors.

## Contrast Standards

### WCAG 2.2 AA as the compliance gate

- 4.5:1 for normal text
- 3:1 for large text and UI components
- No AAA — unnecessarily restrictive, eliminates most brand palettes

### APCA Lc as supplementary

APCA is more perceptually accurate (especially dark mode) but not yet normative. Compute and report it alongside WCAG, but never gate on it. Positive Lc = dark-on-light, negative = light-on-dark.

### WCAG ratio is symmetric

The contrast ratio between two colors is the same regardless of which is foreground vs background. APCA's sign differs (indicates which is lighter), but the absolute Lc value is what matters for thresholds.

## Colorblind Considerations

### Red-green deficiencies are ~2,600x more prevalent than tritanopia

When making tradeoffs between colorblind types, strongly favor deuteranopia/protanopia safety over tritanopia safety. This matters especially for healthcare audiences.

### Warning: dark foreground on yellow

White text on yellow warning backgrounds is a common design failure (contrast ~1.8:1). Always use dark text on yellow/amber. This mirrors real-world conventions (road signs, caution tape).

### Destructive vs. brand red

If the brand has a red-adjacent accent (like Tomato at hue 30), the destructive color needs at least 15 degrees of hue separation. But also consider chroma — different chroma profiles create additional visual distinction even at minimum hue separation.

## Library Gotchas

### culori (v4)

- **No bundled types.** Install `@types/culori` as a devDependency.
- **`displayable()` false positive on white.** `culori.displayable('#ffffff')` can return `false` because OKLCH conversion produces `l: 1.0000000000000002` (float precision). Use an RGB epsilon check instead: convert to RGB, verify all channels are within `[-epsilon, 1+epsilon]` where epsilon is ~1e-6.
- **`Math.round()` on tiny negatives produces `-0`.** Normalize with `|| 0`.

### apca-w3

- **No bundled types.** Install `@types/apca-w3` as a devDependency.
- **`sRGBtoY()` expects 0-255 integers**, not 0-1 floats. Culori's RGB channels are 0-1, so multiply by 255 and round.
- **`APCAcontrast()` returns a signed float.** Use `Math.abs()` for threshold checks, preserve sign for reporting.

## Token Architecture

### Three-layer CSS pattern

For Tailwind v4 + shadcn/ui projects:

1. **Primitives** (`@theme`) — raw OKLCH ramp values as `--color-{name}-{stop}`. Tailwind auto-generates utilities.
2. **Semantic tokens** (`:root` / `.dark`) — theme-aware aliases like `--primary: var(--color-slate-blue-800)`.
3. **Tailwind mapping** (`@theme inline`) — connects semantic tokens to Tailwind utility classes without duplicate utilities.

### Token sources

A semantic token's value is either:
- A **ramp reference** (`ramp('slate-blue', 800)`) — preferred, enables Figma aliases and variant access
- A **literal** (`oklch(59% 0.19 30)`) — for colors that don't fit any ramp

Ramp references are strongly preferred because they enable Figma variable aliasing (designers can trace a token back to its primitive), hover/border variants, and consistent dark mode inversions.

### All Figma tokens should be aliases

Every Figma semantic variable should resolve to an alias, not a direct RGB value. Direct values break Figma's variable linking — designers can't trace tokens to primitives, and changing a primitive doesn't cascade. For colors with no ramp stop (pure white, pure black), add named base primitives.

## Figma Integration

### Plugin API, not REST API

Figma's REST API does not support reading or writing variables on the Professional plan (requires Enterprise). A custom plugin using the Plugin API is the workaround.

### Plugin sandbox limitations

- Cannot import from external modules — types must be duplicated inline
- Does NOT support `??` (nullish coalescing) — use `||` instead
- `createVariable()` requires the collection node object, NOT the `collection.id` string
- Compile with `tsc` separately from the main project

### W3C Design Tokens format

Figma exports variables as W3C Design Tokens JSON. Key structure:
- Primitives: `color/{ramp-name}/{stop}` with sRGB values
- Semantics: token names with `aliasData.targetVariableName` pointing to primitives
- Base primitives: `color/base/{name}` for white, black, brand colors

### Code syntax overrides

Set `codeSyntax.WEB` on every Figma variable so Dev Mode shows the exact CSS custom property name. This decouples Figma's variable naming/grouping from the web token names.
