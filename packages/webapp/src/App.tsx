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
    <div className="flex flex-col h-screen bg-neutral-950 text-white">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-semibold">huelab</h1>
        <div className="flex items-center gap-2">
          <select
            value={state.systemSettings.chromaCurve}
            onChange={(e) => dispatch({ type: 'SET_CHROMA_CURVE', curve: e.target.value as ChromaCurve })}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
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
                ? 'border-blue-600 bg-blue-900/50 text-blue-300'
                : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
            aria-label="Auto hue shift"
            aria-pressed={state.systemSettings.autoHueShift}
          >
            Hue Shift {state.systemSettings.autoHueShift ? 'On' : 'Off'}
          </button>

          <button
            onClick={() => setImportOpen(true)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
          >
            Import
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
          >
            Export
          </button>
          <select
            className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
            defaultValue="shadcn"
          >
            <option value="shadcn">shadcn/ui</option>
          </select>
        </div>
      </header>

      {/* Main three-panel layout */}
      <main className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-neutral-800 p-4">
          <RampEditor />
        </div>
        <div className="flex-1 overflow-y-auto">
          <TokenMap />
        </div>
        <div className="w-80 shrink-0 overflow-y-auto border-l border-neutral-800 p-4">
          <AuditPanel />
        </div>
      </main>

      {/* Ramp overview strip */}
      <footer className="border-t border-neutral-800 px-4 py-2">
        <RampOverview />
      </footer>

      {/* Modals */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
