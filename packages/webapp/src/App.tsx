export function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-semibold">huelab</h1>
      </header>
      <main className="flex flex-1">
        <div className="w-80 border-r border-neutral-800 p-4">
          {/* Ramp Editor — Task 14 */}
          <p className="text-neutral-400">Ramp Editor</p>
        </div>
        <div className="flex-1 p-4">
          {/* Token Map — Task 16 */}
          <p className="text-neutral-400">Token Map</p>
        </div>
        <div className="w-80 border-l border-neutral-800 p-4">
          {/* Audit Panel — Task 17 */}
          <p className="text-neutral-400">Audit Panel</p>
        </div>
      </main>
      <footer className="border-t border-neutral-800 px-4 py-2">
        {/* Ramp Overview — Task 15 */}
        <p className="text-neutral-400">Ramp Overview</p>
      </footer>
    </div>
  );
}
