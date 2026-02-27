# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/). Until 1.0.0, minor versions (0.x.0) may include breaking changes.

## [0.2.1] — 2026-02-27

### Fixed

- Light/dark mode toggle now visually updates the webapp using CSS custom properties ([#8](https://github.com/joshuarudd/huelab/issues/8))

## [0.2.0] — 2026-02-27

### Added

- Webapp state (ramps, token mappings, settings) now persists to localStorage and restores on page reload ([#6](https://github.com/joshuarudd/huelab/issues/6))

## [0.1.0] — 2026-02-27

Initial v0.1 release — core library and interactive webapp. PR [#1](https://github.com/joshuarudd/huelab/pull/1).

### `@huelab/core`

#### Added

- **OKLCH color math** — parsing, conversion (OKLCH/hex/RGB), gamut clamping, hue difference
- **Contrast engine** — WCAG 2.2 ratio + APCA Lc calculation
- **Perceptual distance** — deltaE OK with component decomposition (dL/dC/dH)
- **Colorblind simulation** — protanopia, deuteranopia, tritanopia via culori
- **Ramp generation** — 11-stop OKLCH ramps with natural/linear/flat chroma curves and gamut mapping
- **Per-stop overrides** — pin any stop's L/C/H independently; survives ramp param changes
- **Ramp editor simplification** — base stop matches base color exactly; `computeBaseStopHex()` helper ([#2](https://github.com/joshuarudd/huelab/issues/2))
- **Token system** — semantic token schema, resolver (tokens → concrete OKLCH/hex values), contrast audit engine
- **CSS import** — parse `:root`, `.dark`, and `@theme` custom property blocks
- **Figma import** — parse W3C Design Tokens JSON
- **CSS export** — three-layer output: `@theme` primitives → `:root`/`.dark` semantic → `@theme inline` Tailwind mapping
- **Figma export** — Figma variable JSON with alias support
- **JSON export** — raw ramp and token mapping data
- **Preset system** — plain-object `Preset` interface with validation utilities
- `hueToName()` utility for human-readable color names

### `@huelab/preset-shadcn`

#### Added

- shadcn/ui + Tailwind CSS v4 preset: 11 stops (50–950), 52 semantic tokens, 15 contrast pairs

### `@huelab/webapp`

#### Added

- Vite + React + Tailwind CSS v4 scaffold (client-side only)
- Project state store with `useReducer` + context
- **Ramp Editor** panel — native OS color picker, chroma curve, per-stop overrides
- **Token Map** panel — semantic token source assignment with description tooltips
- **Audit Panel** — live WCAG contrast checking with pass/fail indicators
- **Ramp Overview Strip** — add/remove ramps at a glance
- **Export modal** — CSS, Figma JSON, and raw JSON output
- **Import modal** — CSS and Figma JSON auto-detection
- Preset selector with end-to-end integration
- Editable ramp names with hue-based auto-naming
- Auto-suggest ramp rename when base color hue changes ([#3](https://github.com/joshuarudd/huelab/issues/3))
- Token source selection persists for unmapped tokens

#### Fixed

- Base stop chroma now matches base color exactly ([#2](https://github.com/joshuarudd/huelab/issues/2))
- Tailwind CSS v4 integration via `@tailwindcss/vite` plugin
- Immutable spread in reducer; tooltip z-index layering
- Color picker value fallback normalization
- Ramp name uniqueness guard; null-safe rename

[0.2.1]: https://github.com/joshuarudd/huelab/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/joshuarudd/huelab/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/joshuarudd/huelab/releases/tag/v0.1.0
