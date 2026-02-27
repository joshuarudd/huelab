/**
 * ColorPicker — hex input + native OS color picker for base color.
 *
 * Accepts hex values via the text input or via the native color picker
 * (click the swatch to open the OS system color picker). Both inputs
 * sync bidirectionally. Validates text input before dispatching changes.
 */

import { useState, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  /** Current hex color value (e.g., "#3b82f6") */
  value: string;
  /** Called when the user commits a valid hex color */
  onChange: (hex: string) => void;
  /** Optional label text */
  label?: string;
}

/** Validates that a string is a valid 3 or 6 digit hex color */
function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Normalize shorthand hex (#abc) to full form (#aabbcc) */
function normalizeHex(value: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return value.toLowerCase();
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);

  // Sync external value changes into the input
  useEffect(() => {
    setInputValue(value);
    setIsInvalid(false);
  }, [value]);

  const handleCommit = useCallback(() => {
    // Add # prefix if missing
    let normalized = inputValue.trim();
    if (normalized && !normalized.startsWith('#')) {
      normalized = '#' + normalized;
    }

    if (isValidHex(normalized)) {
      const full = normalizeHex(normalized);
      setInputValue(full);
      setIsInvalid(false);
      onChange(full);
    } else {
      setIsInvalid(true);
    }
  }, [inputValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleCommit();
      }
    },
    [handleCommit],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--app-text-muted)]">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        {/* Native color picker styled as swatch */}
        <input
          type="color"
          value={isValidHex(inputValue) ? normalizeHex(inputValue) : normalizeHex(value)}
          onChange={(e) => {
            const hex = e.target.value.toLowerCase();
            setInputValue(hex);
            setIsInvalid(false);
            onChange(hex);
          }}
          className="h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border border-[var(--app-border-secondary)] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-none"
          aria-label={label ? `${label} color picker` : 'Color picker'}
        />
        {/* Hex input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsInvalid(false);
          }}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          placeholder="#000000"
          className={`h-9 flex-1 rounded-md border bg-[var(--app-surface)] px-2.5 text-sm font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:outline-none focus:ring-1 ${
            isInvalid
              ? 'border-[var(--app-error)] focus:ring-[var(--app-error)]'
              : 'border-[var(--app-border-secondary)] focus:ring-[var(--app-border-secondary)]'
          }`}
          aria-label={label ?? 'Hex color input'}
          aria-invalid={isInvalid}
        />
      </div>
      {isInvalid && (
        <p className="text-xs text-[var(--app-error)]">
          Enter a valid hex color (e.g., #3b82f6)
        </p>
      )}
    </div>
  );
}
