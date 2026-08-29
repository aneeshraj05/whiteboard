import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Tools',
      shortcuts: [
        { key: '1 or V', desc: 'Selection Tool' },
        { key: 'H or Space', desc: 'Hand / Pan Tool' },
        { key: '2 or R', desc: 'Rectangle' },
        { key: '3 or D', desc: 'Diamond' },
        { key: '4 or O', desc: 'Ellipse / Circle' },
        { key: '5 or A', desc: 'Arrow' },
        { key: '6 or L', desc: 'Line' },
        { key: '7 or P', desc: 'Freehand Draw' },
        { key: '8 or T', desc: 'Text' },
        { key: '9', desc: 'Insert Image' },
        { key: '0 or E', desc: 'Eraser' },
      ],
    },
    {
      title: 'Editing & Canvas',
      shortcuts: [
        { key: 'Ctrl + Z', desc: 'Undo' },
        { key: 'Ctrl + Y', desc: 'Redo' },
        { key: 'Ctrl + A', desc: 'Select All' },
        { key: 'Ctrl + C', desc: 'Copy' },
        { key: 'Ctrl + V', desc: 'Paste' },
        { key: 'Ctrl + D', desc: 'Duplicate' },
        { key: 'Del / Backspace', desc: 'Delete Selected' },
        { key: 'Ctrl + S', desc: 'Save to JSON' },
        { key: 'Ctrl + O', desc: 'Open Document' },
        { key: '+ / -', desc: 'Zoom In / Out' },
        { key: 'Ctrl + 0', desc: 'Reset Zoom (100%)' },
        { key: '?', desc: 'Toggle Shortcuts Modal' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

      <div className="relative w-full max-w-xl bg-white dark:bg-[#1e1e24] shadow-2xl rounded-2xl p-6 z-10 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
              <Keyboard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {group.title}
              </h4>
              <div className="flex flex-col gap-1.5">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between py-1 text-xs"
                  >
                    <span className="text-slate-600 dark:text-slate-300">{sc.desc}</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
