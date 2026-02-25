import { useState } from 'react';
import { RampEditor } from './components/RampEditor.js';
import { RampOverview } from './components/RampOverview.js';
import { AuditPanel } from './components/AuditPanel.js';
import { TokenMap } from './components/TokenMap.js';
import { ImportModal } from './components/ImportModal.js';
import { ExportModal } from './components/ExportModal.js';

export function App() {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-semibold">huelab</h1>
        <div className="flex items-center gap-2">
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
