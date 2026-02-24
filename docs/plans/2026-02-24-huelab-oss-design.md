# huelab — Open Source Accessible Color System Toolkit

**Date**: 2026-02-24
**Status**: Approved design, pre-implementation

---

## Overview

huelab is an open source accessible color system toolkit: a pure TypeScript core library and an interactive client-side webapp. It enables designers and developers to build, audit, and export accessible color systems with real-time feedback.

**Primary audience**: Design system consultants working on accessibility engagements.
**Secondary audience**: Product teams building their own design systems, and individual developers checking color accessibility.

## Core Workflow

huelab is a hub: import from anywhere, manipulate interactively, export to anywhere.

```
Import (CSS, Figma JSON, brand hex)
  → Interactive manipulation (ramps, tokens, contrast)
  → Export (CSS three-layer, Figma JSON, raw JSON)
```

Users can start from brand colors and build outward, or import an existing theme and audit/fix it. Both directions are first-class.

## Architecture

### Monorepo Structure

```
huelab/
  packages/
    core/           @huelab/core — pure TS library, zero DOM deps
    webapp/         @huelab/webapp — React + Vite interactive UI
    preset-shadcn/  @huelab/preset-shadcn — shadcn/ui + Tailwind v4 preset
  docs/
    plans/          Design docs and implementation plans
  REFERENCE.md      Technical lessons from the Collabrios engagement
```

### Core Library (`@huelab/core`)

Pure TypeScript, no DOM dependencies. All functions are immutable data in, immutable data out. No side effects, no file I/O.

**Color math**
- `oklch.ts` — parsing, conversion (OKLCH <-> hex <-> RGB), gamut clamping (reduce chroma, preserve lightness)
- `contrast.ts` — WCAG 2.2 luminance + ratio, APCA Lc, AA/AAA threshold helpers
- `distance.ts` — perceptual distance (deltaE OK), component decomposition (dL/dC/dH)
- `simulate.ts` — colorblind simulation (protanopia, deuteranopia, tritanopia) via culori

**Ramp generation**
- `ramp.ts` — generate OKLCH ramps from a base color + parameters (lightness targets, chroma curve, hue shift). Returns a `Ramp` object with computed stops.
- `overrides.ts` — per-stop pin/override system. Tracks which stops are algorithmic vs. manually pinned. Can clear overrides to snap back to the algorithm.

**Token system**
- `tokens.ts` — semantic token schema definition (name, role, light/dark source references). Token sources point to ramp stops or literal values.
- `resolver.ts` — resolves a token mapping against loaded ramps into concrete OKLCH/hex values per mode
- `audit.ts` — given resolved tokens, check all fg/bg pairs against WCAG thresholds, return pass/fail report

**Import/export**
- `import-css.ts` — parse CSS custom properties (`:root` / `.dark` blocks) into token + ramp structures
- `import-figma.ts` — parse Figma W3C Design Tokens JSON into ramps + tokens
- `export-css.ts` — emit three-layer CSS (primitives, semantic, Tailwind mapping)
- `export-figma.ts` — emit Figma variable JSON
- `export-json.ts` — raw data export (ramp JSON, token mapping JSON)

**Preset system**
- A `Preset` interface defines: stop definitions (count + naming), a default token schema, and output format templates
- Presets are plain objects — easy to create and share
- `@huelab/preset-shadcn` ships as the flagship preset

### Webapp (`@huelab/webapp`)

**Tech stack**: React + Vite + Tailwind CSS v4. Fully client-side, no backend. All computation runs in the browser via `@huelab/core`.

**Three-panel workspace layout:**

```
+-----------------------------------------------------+
|  Toolbar: [Import v] [Export v] [Preset: shadcn v]   |
+------------+------------------+---------------------+
|            |                  |                     |
|  Ramp      |  Token           |  Audit              |
|  Editor    |  Map             |  Panel              |
|            |                  |                     |
|  - Base    |  - Semantic      |  - Contrast matrix  |
|    color   |    tokens list   |  - Pass/fail pairs  |
|    picker  |  - Each token    |  - APCA Lc values   |
|  - L/C/H   |    shows source  |  - Colorblind sim   |
|    params  |    ramp + stop   |  - Perceptual       |
|  - Curve   |  - Light/dark    |    distance          |
|    type    |    mode toggle   |  - Live preview     |
|  - Per-    |  - Reassign      |    swatches         |
|    stop    |    stops via     |                     |
|    strip   |    dropdown      |                     |
|  - Override|                  |                     |
|    badges  |                  |                     |
|            |                  |                     |
+------------+------------------+---------------------+
|  Ramp overview: all loaded ramps as compact strips   |
|  Click to select, + to add, x to remove              |
+-----------------------------------------------------+
```

**Panel 1 — Ramp Editor** (left)
- Color picker for the base color (hex input + visual picker)
- Sliders for ramp parameters: chroma curve (natural/linear/flat), hue shift range, base lightness
- 11-stop strip rendered vertically with swatches. Each stop shows hex + L/C/H.
- Click a stop to override: L/C/H sliders for that stop. Override badge appears. Click badge to clear and snap back to algorithm.
- Changes propagate instantly to Token Map and Audit Panel.

**Panel 2 — Token Map** (center)
- All semantic tokens from the active preset
- Each token shows resolved color swatch for light and dark mode side by side
- Source reference shown (e.g., "slate-blue-600") — click to jump to that ramp/stop
- Reassign a token's source: dropdown of ramp + stop combinations, or type a literal OKLCH value
- Light/dark mode toggle to preview the full theme

**Panel 3 — Audit Panel** (right)
- All fg/bg pairs with live WCAG ratio + APCA Lc
- Color-coded pass/fail badges
- Colorblind simulation toggle
- Perceptual distance warnings when tokens are too close
- Click a failing pair to highlight both tokens in Token Map

**Bottom strip — Ramp overview**
- All loaded ramps as compact horizontal strips
- Click to select for editing
- Add/remove ramps
- Visual indicator of which ramps are referenced by tokens vs. unused

**Import/export**
- Import: file picker or paste, auto-detects format (CSS, Figma JSON, raw hex list)
- Export: modal with format selector + preview before download
- URL state: project serializable to a shareable URL (base64 hash fragment)

## Preset System

A preset provides:
1. **Stop definitions** — count, naming convention, lightness targets
2. **Token schema** — semantic token names, roles, default fg/bg pairs
3. **Output templates** — how to format CSS, variable naming conventions

```typescript
interface Preset {
  name: string;
  stops: StopDefinition[];
  tokenSchema: TokenSchemaDefinition;
  outputFormats: OutputFormatDefinition[];
}
```

The `@huelab/preset-shadcn` preset ships with:
- 11 stops (50-950, Tailwind convention)
- ~52 shadcn/ui semantic tokens
- Three-layer CSS output (primitives, semantic, Tailwind mapping)

## Ramp Generation

### Algorithm

Based on the proven approach from the Collabrios engagement:

- **Lightness targets**: Fixed per stop (50=0.985 down to 950=0.17), non-linear with wider spacing in 300-700
- **Chroma curves**: `natural` (bell, peak at 500), `linear`, `flat` (uniform, gamut clamps at extremes)
- **Base color**: Anchors hue + max chroma. Scale factor 1.00 at stop 500 for natural curve.
- **Hue shift**: Linear interpolation from -shift/2 (lightest) to +shift/2 (darkest)
- **Gamut mapping**: Reduce chroma, preserve lightness. Uses culori's `clampChroma`.
- **Achromatic inputs** (C < 0.001): Hue forced to 0 to avoid noise.

### Per-Stop Overrides

Parameter-driven by default (ramps stay mathematically coherent), with per-stop overrides:
- Override any stop's L, C, or H independently
- Overridden stops flagged visually (badge in UI, metadata in data model)
- Clear an override to snap back to the algorithm
- Overrides persist through ramp parameter changes (the pinned value stays)

## Editing Model

The hybrid approach: parameter-driven ramps with per-stop overrides as a first-class concept.

This addresses the key pain point from the Collabrios engagement: the batch CLI workflow couldn't show the effects of color tweaks in real time, which pushed manual Figma work. The webapp makes the feedback loop instant.

## Key Design Principles

1. **Immutable data in, immutable data out** — the core library has no side effects
2. **OKLCH everywhere internally** — convert to hex/RGB only at output boundaries
3. **WCAG 2.2 AA as the gate, APCA Lc as supplementary** — matches current compliance standards
4. **Gamut mapping preserves lightness, sacrifices chroma** — cross-ramp consistency
5. **Fixed lightness targets per stop** — base color is NOT preserved verbatim; consistency across ramps is more important
6. **Presets are plain objects** — easy to create, share, and customize

## MVP Scope (v0.1)

**Core library:**
- OKLCH color math (parse, convert, gamut clamp)
- WCAG 2.2 contrast + APCA Lc
- Ramp generation with all three chroma curves + hue shift
- Per-stop overrides (pin/clear)
- Token schema definition + resolver
- Audit engine (fg/bg pair checking)
- CSS import (parse `:root` / `.dark` blocks)
- Figma JSON import (W3C Design Tokens format)
- CSS export (three-layer)
- Figma JSON export
- shadcn/ui + Tailwind preset

**Webapp:**
- Three-panel layout (ramp editor, token map, audit panel)
- Base color picker + parameter sliders with live ramp preview
- Per-stop override editing
- Token-to-ramp-stop assignment
- Live contrast pass/fail for all pairs
- Light/dark mode toggle
- Import from CSS and Figma JSON (auto-detect format)
- CSS and Figma JSON export

## Future Versions

**v0.2 — Sharing + simulation**
- URL-based project sharing (hash fragment)
- Colorblind simulation toggle in audit panel
- Perceptual distance warnings

**v0.3 — Polish + ecosystem**
- Additional presets (Material, vanilla CSS)
- HTML swatch sheet export
- Raw JSON export
- Ramp comparison view (side-by-side options)

**Future — Local dev tool**
- `npx huelab` serves the webapp locally
- File watcher reads/writes CSS and Figma JSON on disk
- CLI commands for CI (contrast check, audit)

## Dependencies

- `culori` — OKLCH/OKLab conversions, gamut mapping, colorblind simulation
- `apca-w3` — APCA Lc contrast calculation
- `@types/culori`, `@types/apca-w3` — type definitions (neither package bundles types)
- `react`, `vite` — webapp
- `tailwindcss` v4 — webapp styling

## Origin

huelab is a clean rewrite inspired by the CLI toolkit built during a consulting engagement for Collabrios Health (healthcare/PACE programs). The engagement proved out the algorithms and identified the need for an interactive tool. The Collabrios codebase serves as a reference, not a starting point.
