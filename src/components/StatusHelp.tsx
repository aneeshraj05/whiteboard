import React from 'react';
import { Check, HelpCircle } from 'lucide-react';

interface StatusHelpProps {
  onOpenHelp: () => void;
  isSaved?: boolean;
}

export const StatusHelp: React.FC<StatusHelpProps> = ({ onOpenHelp, isSaved = true }) => {
  return (
    <div className="flex items-center gap-2 pointer-events-auto select-none">
      {/* Saved Status Indicator */}
      <div
        title="Drawings are saved locally in browser storage"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#1e1e24] shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-medium text-brand-600 dark:text-brand-400"
      >
        <div className="w-4 h-4 rounded-full bg-brand-500/15 flex items-center justify-center">
          <Check className="w-3 h-3 text-brand-600 dark:text-brand-400 stroke-[3]" />
        </div>
        <span className="hidden sm:inline font-mono text-[11px]">Saved</span>
      </div>

      {/* Help / Shortcuts Button */}
      <button
        onClick={onOpenHelp}
        title="Shortcuts & Help (?)"
        className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#1e1e24] shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </div>
  );
};
