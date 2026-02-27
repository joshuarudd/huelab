import { useState } from 'react';
import { RampEditor } from './components/RampEditor.js';
import { RampOverview } from './components/RampOverview.js';
import { AuditPanel } from './components/AuditPanel.js';
import { TokenMap } from './components/TokenMap.js';
import { ImportModal } from './components/ImportModal.js';
import { ExportModal } from './components/ExportModal.js';
import { useProject } from './store.js';
import type { ChromaCurve } from '@huelab/core';

export function App() {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { state, dispatch } = useProject();

  return (
    <div className="flex flex-col h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
        <h1 className="text-lg font-semibold">
          <a href="https://github.com/joshuarudd/huelab" target="_blank" rel="noopener noreferrer">
            huelab <span className="text-sm font-normal text-[var(--app-text-muted)]">0.2.2</span>
          </a>
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={state.systemSettings.chromaCurve}
            onChange={(e) => dispatch({ type: 'SET_CHROMA_CURVE', curve: e.target.value as ChromaCurve })}
            className="rounded-md border border-[var(--app-border-secondary)] bg-[var(--app-elevated)] px-3 py-1.5 text-sm text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)]"
            aria-label="Chroma curve"
          >
            <option value="natural">Natural (bell)</option>
            <option value="linear">Linear</option>
            <option value="flat">Flat (uniform)</option>
          </select>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_AUTO_HUE_SHIFT', enabled: !state.systemSettings.autoHueShift })}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              state.systemSettings.autoHueShift
                ? 'border-[var(--app-accent)] bg-[var(--app-accent-bg)] text-[var(--app-accent-text)]'
                : 'border-[var(--app-border-secondary)] bg-[var(--app-elevated)] text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)]'
            }`}
            aria-label="Auto hue shift"
            aria-pressed={state.systemSettings.autoHueShift}
          >
            Hue Shift {state.systemSettings.autoHueShift ? 'On' : 'Off'}
          </button>

          <button
            onClick={() => setImportOpen(true)}
            className="rounded-md border border-[var(--app-border-secondary)] bg-[var(--app-elevated)] px-3 py-1.5 text-sm text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)]"
          >
            Import
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="rounded-md border border-[var(--app-border-secondary)] bg-[var(--app-elevated)] px-3 py-1.5 text-sm text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)]"
          >
            Export
          </button>
          <select
            className="rounded-md border border-[var(--app-border-secondary)] bg-[var(--app-elevated)] px-3 py-1.5 text-sm text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)]"
            defaultValue="shadcn"
          >
            <option value="shadcn">shadcn/ui</option>
          </select>
        </div>
      </header>

      {/* Main three-panel layout */}
      <main className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-[var(--app-border)] p-4">
          <RampEditor />
        </div>
        <div className="flex-1 overflow-y-auto">
          <TokenMap />
        </div>
        <div className="w-80 shrink-0 overflow-y-auto border-l border-[var(--app-border)] p-4">
          <AuditPanel />
        </div>
      </main>

      {/* Ramp overview strip */}
      <footer className="border-t border-[var(--app-border)] px-4 py-2">
        <RampOverview />
      </footer>

      {/* Modals */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
