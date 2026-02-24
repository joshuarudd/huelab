/**
 * shadcn/ui + Tailwind CSS v4 preset for huelab.
 *
 * Provides:
 * - 11 stops (50-950) matching Tailwind conventions
 * - ~52 shadcn/ui semantic tokens
 * - Three-layer CSS output format
 */

import type { Preset } from '@huelab/core';

/**
 * Tailwind-convention lightness targets.
 * Non-linear: wider spacing in 300-700 where most UI work happens.
 */
const TAILWIND_STOPS = [
  { id: 50, label: '50', lightness: 0.985 },
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
] as const;

export const shadcnPreset: Preset = {
  name: 'shadcn-tailwind',
  description: 'shadcn/ui + Tailwind CSS v4 — 11 stops, 52 semantic tokens, three-layer CSS',
  stops: [...TAILWIND_STOPS],
  tokenSchema: {
    tokens: [
      // Core
      { name: '--background', description: 'Page background' },
      { name: '--foreground', description: 'Default text color' },
      { name: '--card', description: 'Card background' },
      { name: '--card-foreground', description: 'Card text color' },
      { name: '--popover', description: 'Popover background' },
      { name: '--popover-foreground', description: 'Popover text color' },
      { name: '--primary', description: 'Primary action background' },
      { name: '--primary-foreground', description: 'Primary action text' },
      { name: '--secondary', description: 'Secondary action background' },
      { name: '--secondary-foreground', description: 'Secondary action text' },
      { name: '--muted', description: 'Muted/disabled background' },
      { name: '--muted-foreground', description: 'Muted/disabled text' },
      { name: '--accent', description: 'Accent background' },
      { name: '--accent-foreground', description: 'Accent text' },

      // Status
      { name: '--destructive', description: 'Destructive action background' },
      { name: '--destructive-foreground', description: 'Destructive action text' },
      { name: '--info', description: 'Info status background' },
      { name: '--info-foreground', description: 'Info status text' },
      { name: '--warning', description: 'Warning status background' },
      { name: '--warning-foreground', description: 'Warning status text' },
      { name: '--success', description: 'Success status background' },
      { name: '--success-foreground', description: 'Success status text' },

      // Subtle status
      { name: '--info-subtle', description: 'Info subtle background' },
      { name: '--info-subtle-foreground', description: 'Info subtle text' },
      { name: '--success-subtle', description: 'Success subtle background' },
      { name: '--success-subtle-foreground', description: 'Success subtle text' },
      { name: '--warning-subtle', description: 'Warning subtle background' },
      { name: '--warning-subtle-foreground', description: 'Warning subtle text' },
      { name: '--destructive-subtle', description: 'Destructive subtle background' },
      { name: '--destructive-subtle-foreground', description: 'Destructive subtle text' },

      // Borders & inputs
      { name: '--border', description: 'Default border color' },
      { name: '--input', description: 'Input border color' },
      { name: '--ring', description: 'Focus ring color' },

      // Charts
      { name: '--chart-1', description: 'Chart color 1' },
      { name: '--chart-2', description: 'Chart color 2' },
      { name: '--chart-3', description: 'Chart color 3' },
      { name: '--chart-4', description: 'Chart color 4' },
      { name: '--chart-5', description: 'Chart color 5' },

      // Sidebar
      { name: '--sidebar-background', description: 'Sidebar background' },
      { name: '--sidebar-foreground', description: 'Sidebar text' },
      { name: '--sidebar-primary', description: 'Sidebar active item' },
      { name: '--sidebar-primary-foreground', description: 'Sidebar active item text' },
      { name: '--sidebar-accent', description: 'Sidebar hover background' },
      { name: '--sidebar-accent-foreground', description: 'Sidebar hover text' },
      { name: '--sidebar-border', description: 'Sidebar border' },
      { name: '--sidebar-ring', description: 'Sidebar focus ring' },

      // Brand
      { name: '--brand-accent', description: 'Brand accent color' },
      { name: '--brand-accent-foreground', description: 'Brand accent text' },

      // Table
      { name: '--table-heading-background', description: 'Table heading background' },
      { name: '--table-heading-foreground', description: 'Table heading text' },
    ],
    pairs: [
      { name: 'primary', foreground: '--primary-foreground', background: '--primary', threshold: 'normalText' },
      { name: 'secondary', foreground: '--secondary-foreground', background: '--secondary', threshold: 'normalText' },
      { name: 'destructive', foreground: '--destructive-foreground', background: '--destructive', threshold: 'normalText' },
      { name: 'info', foreground: '--info-foreground', background: '--info', threshold: 'normalText' },
      { name: 'warning', foreground: '--warning-foreground', background: '--warning', threshold: 'normalText' },
      { name: 'success', foreground: '--success-foreground', background: '--success', threshold: 'normalText' },
      { name: 'info-subtle', foreground: '--info-subtle-foreground', background: '--info-subtle', threshold: 'normalText' },
      { name: 'success-subtle', foreground: '--success-subtle-foreground', background: '--success-subtle', threshold: 'normalText' },
      { name: 'warning-subtle', foreground: '--warning-subtle-foreground', background: '--warning-subtle', threshold: 'normalText' },
      { name: 'destructive-subtle', foreground: '--destructive-subtle-foreground', background: '--destructive-subtle', threshold: 'normalText' },
      { name: 'muted', foreground: '--muted-foreground', background: '--muted', threshold: 'normalText' },
      { name: 'accent', foreground: '--accent-foreground', background: '--accent', threshold: 'normalText' },
      { name: 'card', foreground: '--card-foreground', background: '--card', threshold: 'normalText' },
      { name: 'popover', foreground: '--popover-foreground', background: '--popover', threshold: 'normalText' },
      { name: 'brand-accent', foreground: '--brand-accent-foreground', background: '--brand-accent', threshold: 'normalText' },
    ],
    defaultMapping: [],
  },
};
