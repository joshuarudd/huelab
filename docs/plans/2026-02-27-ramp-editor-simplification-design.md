# Ramp Editor Simplification — Design

**Date:** 2026-02-27
**Issue:** [#2 — Ramp Editor: hue shift and base lightness sliders don't update the base color swatch/hex](https://github.com/joshuarudd/huelab/issues/2)

## Problem

The Ramp Editor's parameter sliders (hue shift, base lightness, chroma curve) create a disconnect between user input and visual output:

- **Hue shift slider**: Changes are too subtle to perceive (max 30° produces single-digit RGB differences). Users report the slider "does nothing."
- **Base lightness slider**: Only affects the base stop, not all stops. Users expect a global effect.
- **Base color mismatch**: The base color swatch shows the user's input, but the algorithm overrides lightness at the mapped stop, so the ramp doesn't contain the color shown in the swatch.
- **Per-ramp parameters**: Chroma curve and hue shift are per-ramp settings, but in practice users want consistent behavior across all ramps in a color system.

## Design

### Per-ramp controls (left panel)

- **Base color picker** — hex input + OS color picker. This is the only per-ramp creative decision.
- **Ramp name** — click to edit, auto-suggest when base color hue changes (existing feature).
- **Base color fit suggestion** — when the user's base color doesn't match its computed stop value, show an inline suggestion: "Maps to stop 500 as #XXXX — [Use #XXXX]". The user can accept or ignore.
- **Stop strip** — per-stop override sliders for fine-grained L/C/H editing (unchanged).

### System-wide controls (top toolbar)

- **Chroma curve** — dropdown: natural (bell) / linear / flat. Applies to all ramps.
- **Auto hue shift** — toggle: on / off. Applies to all ramps.

### Algorithm changes

**`RampParams` simplifies to:**
```ts
interface RampParams {
  baseColor: string;
}
```

**Chroma curve and hue shift move to system-wide settings** (stored on the project state, not per-ramp).

**Auto hue shift behavior (when enabled):**
- ~10° total shift centered on the base hue
- Lightest stops shift warm (toward yellow/lower hue angles)
- Darkest stops shift cool (toward blue/higher hue angles)
- The anchor stop preserves the exact base hue
- Linear interpolation from `-5°` at lightest to `+5°` at darkest

**Auto hue shift disabled:**
- All stops use the exact base hue

**Base color fit suggestion:**
- After generating the ramp, compute the color at the anchor stop (base hue + chroma at the stop's fixed lightness)
- Compare to the user's input base color
- If they differ, surface a suggestion in the UI with the computed hex value
- Accepting the suggestion updates the base color input to match

### What's removed

- `hueShift` from `RampParams` (replaced by system-wide auto toggle)
- `baseLightness` from `RampParams` (removed entirely; per-stop overrides cover this)
- `chromaCurve` from `RampParams` (moved to system-wide setting)
- Hue shift slider from ParamSliders
- Base lightness slider from ParamSliders
- Chroma curve dropdown from ParamSliders

### What's preserved

- Per-stop L/C/H override sliders in StopStrip
- Ramp name editing with auto-suggest
- All core ramp generation math (lightness targets, chroma scaling, gamut clamping)
