/**
 * ImportModal — modal for importing CSS or Figma JSON into the project.
 *
 * Supports two import formats:
 * - CSS (detected by @theme or :root keywords) — uses importCSS from core
 * - Figma W3C Design Tokens JSON (detected by $type or colorSpace) — uses importFigmaJSON
 *
 * The modal provides a file picker and a paste area. Auto-detects the format
 * from the content, shows a preview (ramp count, token count), and dispatches
 * SET_RAMPS + SET_TOKEN_MAPPING to the store on import.
 */

import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  importCSS,
  importFigmaJSON,
  generateRamp,
  getStops,
  parseColor,
  type Ramp,
  type TokenDefinition,
  type TokenSource,
  type CSSImportResult,
  type FigmaImportInput,
} from '@huelab/core';
import { useProject } from '../store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DetectedFormat = 'css' | 'figma-json' | null;

interface ImportPreview {
  rampCount: number;
  tokenCount: number;
  rampNames: string[];
  format: DetectedFormat;
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Auto-detect whether the content is CSS or Figma JSON.
 * - Contains @theme or :root -> CSS
 * - Contains $type or colorSpace -> Figma JSON
 */
function detectFormat(content: string): DetectedFormat {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Try parsing as JSON first — if it has $type or colorSpace it's Figma
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const json = JSON.stringify(parsed);
        if (json.includes('"$type"') || json.includes('"colorSpace"')) {
          return 'figma-json';
        }
      }
    } catch {
      // Not valid JSON — fall through
    }
  }

  // Check for CSS markers
  if (/@theme\b/.test(trimmed) || /:root\b/.test(trimmed)) {
    return 'css';
  }

  // Check for Figma JSON markers in raw text (user may paste partial JSON)
  if (trimmed.includes('"$type"') || trimmed.includes('"colorSpace"')) {
    return 'figma-json';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Token conversion helpers
// ---------------------------------------------------------------------------

/** Pattern for ramp references like "blue-500", "gray-100", etc. */
const RAMP_REF_REGEX = /^([\w-]+?)-(\d+)$/;

/**
 * Convert a token value string to a TokenSource.
 * If it matches "{rampName}-{stopId}" pattern, creates a ramp source.
 * Otherwise, treats it as a literal CSS color.
 */
function valueToSource(value: string): TokenSource {
  const match = RAMP_REF_REGEX.exec(value);
  if (match) {
    const ramp = match[1];
    const stop = parseInt(match[2], 10);
    return { type: 'ramp', ramp, stop };
  }
  return { type: 'literal', value };
}

/**
 * Merge light and dark token maps into an array of TokenDefinition.
 *
 * Collects all unique token names from both maps, creates a definition
 * for each with the appropriate source for each mode.
 */
function tokensToDefinitions(
  lightTokens: Record<string, string>,
  darkTokens: Record<string, string>,
): TokenDefinition[] {
  const allNames = new Set<string>([
    ...Object.keys(lightTokens),
    ...Object.keys(darkTokens),
  ]);

  const definitions: TokenDefinition[] = [];

  for (const name of allNames) {
    const lightValue = lightTokens[name];
    const darkValue = darkTokens[name];

    // Default to a literal transparent if a mode is missing
    const lightSource: TokenSource = lightValue
      ? valueToSource(lightValue)
      : { type: 'literal', value: 'transparent' };
    const darkSource: TokenSource = darkValue
      ? valueToSource(darkValue)
      : { type: 'literal', value: 'transparent' };

    definitions.push({
      name,
      light: lightSource,
      dark: darkSource,
    });
  }

  // Sort by name for consistent ordering
  definitions.sort((a, b) => a.name.localeCompare(b.name));

  return definitions;
}

// ---------------------------------------------------------------------------
// CSS ramp conversion
// ---------------------------------------------------------------------------

/**
 * Convert CSS import ramps (which have string color values per stop)
 * into full Ramp objects using generateRamp.
 *
 * Strategy: Use the middle stop's color value as the base color, then
 * generate a fresh ramp with that base color. This preserves the ramp's
 * hue and approximate chroma but uses the algorithm's lightness targets.
 */
function cssRampsToRamps(
  cssRamps: CSSImportResult['ramps'],
  stops: ReturnType<typeof getStops>,
): Ramp[] {
  return cssRamps.map((cssRamp) => {
    // Find the middle stop to use as the base color
    const middleIndex = Math.floor(cssRamp.stops.length / 2);
    const middleStop = cssRamp.stops[middleIndex];
    const baseColorStr = middleStop?.value ?? '#808080';

    // Validate the color parses; fall back to gray if not
    const parsed = parseColor(baseColorStr);
    const baseColor = parsed ? baseColorStr : '#808080';

    return generateRamp(
      cssRamp.name,
      {
        baseColor,
        chromaCurve: 'natural',
        hueShift: 0,
      },
      stops,
    );
  });
}

// ---------------------------------------------------------------------------
// Figma JSON normalization
// ---------------------------------------------------------------------------

/**
 * Attempt to normalize raw JSON into a FigmaImportInput shape.
 *
 * Figma JSON may come in different structures:
 * - Already has { primitives, light, dark }
 * - Is a flat object of color tokens (treat as primitives)
 * - Has nested collections
 */
function normalizeFigmaInput(raw: unknown): FigmaImportInput {
  if (typeof raw !== 'object' || raw === null) {
    return { primitives: {}, light: {}, dark: {} };
  }

  const obj = raw as Record<string, unknown>;

  // If it already has the expected shape
  if ('light' in obj && 'dark' in obj) {
    return {
      primitives: (obj.primitives ?? {}) as Record<string, unknown>,
      light: obj.light as Record<string, unknown>,
      dark: obj.dark as Record<string, unknown>,
    };
  }

  // If it looks like a flat primitives collection (has color/ keys or $type entries)
  // treat the whole thing as primitives with empty semantic layers
  return {
    primitives: obj,
    light: {},
    dark: {},
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const { state, dispatch } = useProject();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Parse content and generate preview
  // ---------------------------------------------------------------------------

  const parseAndPreview = useCallback((text: string) => {
    setContent(text);
    setError(null);
    setPreview(null);

    if (!text.trim()) return;

    const format = detectFormat(text);
    if (!format) {
      setError('Unable to detect format. Expected CSS (with @theme or :root) or Figma JSON (with $type or colorSpace).');
      return;
    }

    try {
      if (format === 'css') {
        const result = importCSS(text);
        const lightCount = Object.keys(result.tokens.light).length;
        const darkCount = Object.keys(result.tokens.dark).length;
        setPreview({
          rampCount: result.ramps.length,
          tokenCount: Math.max(lightCount, darkCount),
          rampNames: result.ramps.map((r) => r.name),
          format,
        });
      } else {
        const raw = JSON.parse(text);
        const input = normalizeFigmaInput(raw);
        const result = importFigmaJSON(input);
        const lightCount = Object.keys(result.tokens.light).length;
        const darkCount = Object.keys(result.tokens.dark).length;
        setPreview({
          rampCount: result.ramps.length,
          tokenCount: Math.max(lightCount, darkCount),
          rampNames: result.ramps.map((r) => r.name),
          format,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Parse error';
      setError(`Failed to parse ${format === 'css' ? 'CSS' : 'JSON'}: ${message}`);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Import action
  // ---------------------------------------------------------------------------

  const handleImport = useCallback(() => {
    if (!content.trim() || !preview) return;

    try {
      const stops = getStops(state.preset);
      let ramps: Ramp[];
      let tokenDefs: TokenDefinition[];

      if (preview.format === 'css') {
        const result = importCSS(content);
        ramps = cssRampsToRamps(result.ramps, stops);
        tokenDefs = tokensToDefinitions(result.tokens.light, result.tokens.dark);
      } else {
        const raw = JSON.parse(content);
        const input = normalizeFigmaInput(raw);
        const result = importFigmaJSON(input);
        ramps = result.ramps;
        tokenDefs = tokensToDefinitions(result.tokens.light, result.tokens.dark);
      }

      // Dispatch to store
      dispatch({ type: 'SET_RAMPS', ramps });
      if (tokenDefs.length > 0) {
        dispatch({ type: 'SET_TOKEN_MAPPING', tokens: tokenDefs });
      }

      // Reset and close
      setContent('');
      setError(null);
      setPreview(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import error';
      setError(`Import failed: ${message}`);
    }
  }, [content, preview, state.preset, dispatch, onClose]);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        parseAndPreview(text);
      };
      reader.onerror = () => {
        setError('Failed to read file.');
      };
      reader.readAsText(file);
    },
    [parseAndPreview],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      readFile(file);
    },
    [readFile],
  );

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        readFile(file);
      }
    },
    [readFile],
  );

  // ---------------------------------------------------------------------------
  // Close + reset
  // ---------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    setContent('');
    setError(null);
    setPreview(null);
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-200">Import</h2>
          <button
            onClick={handleClose}
            className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* File picker */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              File
            </label>
            <div
              className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'border-neutral-700 hover:border-neutral-600'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <p className="text-sm text-neutral-400">
                  Drop a file here or{' '}
                  <span className="text-blue-400 underline">browse</span>
                </p>
                <p className="mt-1 text-[10px] text-neutral-600">
                  Accepts .css or .json
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".css,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-neutral-800" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
              or paste
            </span>
            <div className="flex-1 border-t border-neutral-800" />
          </div>

          {/* Paste area */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              CSS or JSON
            </label>
            <textarea
              value={content}
              onChange={(e) => parseAndPreview(e.target.value)}
              placeholder={'Paste CSS (@theme/:root) or Figma JSON here...'}
              rows={8}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300 placeholder-neutral-600 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/50"
              spellCheck={false}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  {preview.format === 'css' ? 'CSS' : 'Figma JSON'}
                </span>
              </div>
              <div className="mt-2 flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-neutral-200">{preview.rampCount}</span>
                  <span className="ml-1 text-neutral-500">
                    {preview.rampCount === 1 ? 'ramp' : 'ramps'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-200">{preview.tokenCount}</span>
                  <span className="ml-1 text-neutral-500">
                    {preview.tokenCount === 1 ? 'token' : 'tokens'}
                  </span>
                </div>
              </div>
              {preview.rampNames.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {preview.rampNames.map((name) => (
                    <span
                      key={name}
                      className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
          <button
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || !!error}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
