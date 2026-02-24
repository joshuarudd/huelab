import { RampEditor } from './components/RampEditor.js';
import { RampOverview } from './components/RampOverview.js';
import { AuditPanel } from './components/AuditPanel.js';

export function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-semibold">huelab</h1>
      </header>
      <main className="flex flex-1">
        <div className="w-80 border-r border-neutral-800 p-4">
          <RampEditor />
        </div>
        <div className="flex-1 p-4">
          {/* Token Map — Task 16 */}
          <p className="text-neutral-400">Token Map</p>
        </div>
        <div className="w-80 border-l border-neutral-800 p-4">
          <AuditPanel />
        </div>
      </main>
      <footer className="border-t border-neutral-800 px-4 py-2">
        <RampOverview />
      </footer>
    </div>
  );
}
