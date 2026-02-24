/**
 * Core type definitions for @huelab/core
 */

// ---------------------------------------------------------------------------
// Color primitives
// ---------------------------------------------------------------------------

/** A color in OKLCH space */
export interface OklchColor {
  l: number; // Lightness (0-1)
  c: number; // Chroma (0+)
  h: number; // Hue (0-360)
}

/** A color in multiple representations */
export interface Color {
  oklch: OklchColor;
  hex: string;
  rgb: { r: number; g: number; b: number }; // 0-255
}

// ---------------------------------------------------------------------------
// Ramp system
// ---------------------------------------------------------------------------

/** A single stop in a color ramp */
export interface RampStop {
  id: number; // e.g., 50, 100, 200, ...
  color: Color;
  overridden: boolean; // true if manually pinned
  overrides?: Partial<OklchColor>; // which components are overridden
}

/** Parameters that control ramp generation */
export interface RampParams {
  baseColor: string; // Input color (hex, oklch, etc.)
  chromaCurve: 'natural' | 'linear' | 'flat';
  hueShift: number; // Degrees of hue shift across the ramp
  baseLightness?: number; // Override lightness at the base stop
}

/** A complete color ramp */
export interface Ramp {
  name: string;
  params: RampParams;
  stops: RampStop[];
  baseStopId: number; // Which stop the base color maps to
}

// ---------------------------------------------------------------------------
// Stop definitions (provided by presets)
// ---------------------------------------------------------------------------

/** Defines the stops in a ramp */
export interface StopDefinition {
  id: number; // e.g., 50, 100, 200
  label: string; // e.g., "50", "100"
  lightness: number; // Target lightness (0-1)
}

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

/** WCAG 2.2 AA thresholds */
export interface ContrastThresholds {
  normalText: number; // 4.5
  largeText: number; // 3.0
  uiComponent: number; // 3.0
}

/** Result of a contrast check */
export interface ContrastResult {
  wcagRatio: number;
  apcaLc: number; // Signed: positive = dark-on-light
  passesAA: {
    normalText: boolean;
    largeText: boolean;
    uiComponent: boolean;
  };
}

// ---------------------------------------------------------------------------
// Token system
// ---------------------------------------------------------------------------

/** How a token gets its value */
export type TokenSource =
  | { type: 'ramp'; ramp: string; stop: number }
  | { type: 'literal'; value: string }; // CSS color string

/** A semantic token definition */
export interface TokenDefinition {
  name: string; // e.g., "--primary"
  description?: string;
  light: TokenSource;
  dark: TokenSource;
}

/** A foreground/background pair for contrast checking */
export interface TokenPairDefinition {
  name: string; // e.g., "primary"
  foreground: string; // Token name
  background: string; // Token name
  threshold: 'normalText' | 'largeText' | 'uiComponent';
}

/** A resolved token (concrete values for a mode) */
export interface ResolvedToken {
  name: string;
  light: Color;
  dark: Color;
  lightSource: string; // e.g., "slate-blue-600"
  darkSource: string;
}

/** Audit result for a single fg/bg pair */
export interface AuditPairResult {
  pair: TokenPairDefinition;
  light: ContrastResult;
  dark: ContrastResult;
  lightPasses: boolean;
  darkPasses: boolean;
}

/** Full audit report */
export interface AuditReport {
  pairs: AuditPairResult[];
  summary: {
    totalPairs: number;
    lightPasses: number;
    darkPasses: number;
    failures: AuditPairResult[];
  };
}

// ---------------------------------------------------------------------------
// Colorblind simulation
// ---------------------------------------------------------------------------

export type DeficiencyType = 'protanopia' | 'deuteranopia' | 'tritanopia';

// ---------------------------------------------------------------------------
// Preset system
// ---------------------------------------------------------------------------

/** A preset provides stop definitions, token schema, and output formats */
export interface Preset {
  name: string;
  description?: string;
  stops: StopDefinition[];
  tokenSchema: {
    tokens: Omit<TokenDefinition, 'light' | 'dark'>[];
    pairs: TokenPairDefinition[];
    defaultMapping: TokenDefinition[];
  };
}

// ---------------------------------------------------------------------------
// Import/export
// ---------------------------------------------------------------------------

/** Parsed result from importing CSS */
export interface CSSImportResult {
  ramps: Array<{ name: string; stops: Array<{ id: number; value: string }> }>;
  tokens: {
    light: Record<string, string>; // token name -> CSS value
    dark: Record<string, string>;
  };
}

/** Parsed result from importing Figma JSON */
export interface FigmaImportResult {
  ramps: Ramp[];
  tokens: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

/** Options for CSS export */
export interface CSSExportOptions {
  includeComments?: boolean;
  indent?: string;
}

/** Options for Figma JSON export */
export interface FigmaExportOptions {
  primitivesCollectionName?: string;
  semanticCollectionName?: string;
  includeCodeSyntax?: boolean;
}
