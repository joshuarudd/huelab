/**
 * ExportModal — overlay modal for exporting color system data.
 *
 * Supports three export formats:
 * - CSS (three-layer): primitives + semantic + Tailwind mapping
 * - Figma JSON: Figma variable import structure
 * - Raw JSON: ramp data + resolved token data
 *
 * Features:
 * - Format selector at top
 * - Scrollable preview pane
 * - Copy to clipboard button
 * - Download button (via URL.createObjectURL + <a download>)
 */

import { useState, useMemo, useCallback } from 'react';
import {
  exportPrimitivesCSS,
  exportSemanticCSS,
  exportTailwindMappingCSS,
  exportFigmaJSON,
  exportRampJSON,
  exportTokensJSON,
} from '@huelab/core';
import { useProject } from '../store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = 'css' | 'figma' | 'json';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Format metadata
// ---------------------------------------------------------------------------

const FORMAT_OPTIONS: { value: ExportFormat; label: string; extension: string; mimeType: string }[] = [
  { value: 'css', label: 'CSS (Three-Layer)', extension: 'css', mimeType: 'text/css' },
  { value: 'figma', label: 'Figma JSON', extension: 'json', mimeType: 'application/json' },
  { value: 'json', label: 'Raw JSON', extension: 'json', mimeType: 'application/json' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExportModal({ open, onClose }: ExportModalProps) {
  const { state, resolvedTokens } = useProject();
  const [format, setFormat] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  // Compute the export output for the selected format
  const output = useMemo(() => {
    const { ramps, tokenMapping } = state;

    if (ramps.length === 0) {
      return '/* No ramps defined — add ramps to generate export output. */';
    }

    try {
      switch (format) {
        case 'css': {
          const primitives = exportPrimitivesCSS(ramps);
          const tokenNames = tokenMapping.map((t) => t.name);
          const semantic = exportSemanticCSS(resolvedTokens, tokenMapping);
          const tailwind = exportTailwindMappingCSS(tokenNames);
          return [
            '/* ==========================================================================',
            '   Layer 1: Primitives — OKLCH color ramp variables',
            '   ========================================================================== */',
            '',
            primitives,
            '',
            '/* ==========================================================================',
            '   Layer 2: Semantic — Light & dark mode token assignments',
            '   ========================================================================== */',
            '',
            semantic,
            '',
            '/* ==========================================================================',
            '   Layer 3: Tailwind — Inline theme mapping for utility classes',
            '   ========================================================================== */',
            '',
            tailwind,
          ].join('\n');
        }

        case 'figma': {
          const figmaExport = exportFigmaJSON(ramps, resolvedTokens, tokenMapping, {
            includeCodeSyntax: true,
          });
          return JSON.stringify(figmaExport, null, 2);
        }

        case 'json': {
          const rampData = ramps.map((ramp) => JSON.parse(exportRampJSON(ramp)));
          const tokenData = JSON.parse(exportTokensJSON(resolvedTokens));
          const combined = {
            ramps: rampData,
            tokens: tokenData,
          };
          return JSON.stringify(combined, null, 2);
        }

        default:
          return '';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `/* Export error: ${message} */`;
    }
  }, [format, state, resolvedTokens]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = output;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  // Download as file
  const handleDownload = useCallback(() => {
    const formatMeta = FORMAT_OPTIONS.find((f) => f.value === format);
    if (!formatMeta) return;

    const blob = new Blob([output], { type: formatMeta.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huelab-export.${formatMeta.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [output, format]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Export color system"
      tabIndex={-1}
    >
      <div className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-100">Export</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Format selector */}
        <div className="flex gap-1 border-b border-neutral-800 px-5 py-3">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setFormat(opt.value);
                setCopied(false);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                format === opt.value
                  ? 'bg-neutral-700 text-neutral-100'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Preview pane */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="max-h-[50vh] overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-300">
            <code>{output}</code>
          </pre>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
          >
            Download
          </button>
          <button
            onClick={handleCopy}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-700 text-green-100'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
