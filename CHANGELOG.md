# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/). Until 1.0.0, minor versions (0.x.0) may include breaking changes.

## [Unreleased]

> Tracking work on `feat/v0.1-core-and-webapp` — PR [#1](https://github.com/joshuarudd/huelab/pull/1)

### Added

- **Ramp editor simplification** — removed hue shift and base lightness sliders; base stop now matches base color exactly; `computeBaseStopHex()` helper added ([#2](https://github.com/joshuarudd/huelab/issues/2))
- **Auto-suggest ramp names** — ramp rename suggested when base color hue changes ([#3](https://github.com/joshuarudd/huelab/issues/3))
- Native OS color picker replaces the color swatch input
- Editable ramp names with hue-based auto-naming via `hueToName()` utility
- Token description tooltips in the Token Map panel
- Token source selection persists for unmapped tokens

### Fixed

- Base stop chroma now matches base color exactly ([#2](https://github.com/joshuarudd/huelab/issues/2))
- Tailwind CSS v4 integration via `@tailwindcss/vite` plugin
- Immutable spread in webapp reducer; tooltip z-index layering
- Color picker value fallback normalization
- Dead imports removed; ramp name uniqueness guard; null-safe rename

## [0.1.0] — 2026-02-25

Initial v0.1 release — core library and interactive webapp.

### `@huelab/core`

#### Added

- **OKLCH color math** — parsing, conversion (OKLCH/hex/RGB), gamut clamping, hue difference
- **Contrast engine** — WCAG 2.2 ratio + APCA Lc calculation
- **Perceptual distance** — deltaE OK with component decomposition (dL/dC/dH)
- **Colorblind simulation** — protanopia, deuteranopia, tritanopia via culori
- **Ramp generation** — 11-stop OKLCH ramps with natural/linear/flat chroma curves, hue shift, and gamut mapping
- **Per-stop overrides** — pin any stop's L/C/H independently; survives ramp param changes
- **Token system** — semantic token schema, resolver (tokens → concrete OKLCH/hex values), contrast audit engine
- **CSS import** — parse `:root`, `.dark`, and `@theme` custom property blocks
- **Figma import** — parse W3C Design Tokens JSON
- **CSS export** — three-layer output: `@theme` primitives → `:root`/`.dark` semantic → `@theme inline` Tailwind mapping
- **Figma export** — Figma variable JSON with alias support
- **JSON export** — raw ramp and token mapping data
- **Preset system** — plain-object `Preset` interface with validation utilities

### `@huelab/preset-shadcn`

#### Added

- shadcn/ui + Tailwind CSS v4 preset: 11 stops (50–950), 52 semantic tokens, 15 contrast pairs

### `@huelab/webapp`

#### Added

- Vite + React + Tailwind CSS v4 scaffold (client-side only)
- Project state store with `useReducer` + context
- **Ramp Editor** panel — base color picker, chroma curve, hue shift, per-stop overrides
- **Token Map** panel — semantic token source assignment
- **Audit Panel** — live WCAG contrast checking with pass/fail indicators
- **Ramp Overview Strip** — add/remove ramps at a glance
- **Export modal** — CSS, Figma JSON, and raw JSON output
- **Import modal** — CSS and Figma JSON auto-detection
- Preset selector with end-to-end integration

[Unreleased]: https://github.com/joshuarudd/huelab/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/joshuarudd/huelab/releases/tag/v0.1.0
