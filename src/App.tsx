import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Sidebar } from './components/Sidebar';
import DrawingMode from './components/modes/DrawingMode';
import { NotesMode } from './components/modes/NotesMode';
import { Menu, FileText } from 'lucide-react';

function AppContent() {
  const { activePage, sidebarOpen, setSidebarOpen } = useWorkspace();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#111113] font-sans">
      {/* Sidebar — shared between both modes */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 relative flex flex-col min-w-0 h-full overflow-hidden">
        {/* Drawing Mode handles its own top bar internally */}
        {activePage?.mode === 'drawing' && <DrawingMode />}

        {/* Notes Mode has its own top bar */}
        {activePage?.mode === 'notes' && <NotesMode />}

        {/* Empty state — no page selected */}
        {!activePage && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-slate-500">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-white dark:bg-[#1e1e28] text-slate-600 dark:text-slate-400 shadow-panel border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                title="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="text-slate-300 dark:text-slate-600">
              <FileText className="w-16 h-16 stroke-[1.5]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">No page selected</p>
              <p className="text-sm">Select a page from the sidebar, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  );
}

export default App;
