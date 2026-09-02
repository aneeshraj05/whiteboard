import React, { useState } from 'react';
import { X, FolderOpen } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface MovePageModalProps {
  isOpen: boolean;
  pageId: string;
  onClose: () => void;
}

export const MovePageModal: React.FC<MovePageModalProps> = ({ isOpen, pageId, onClose }) => {
  const { workspace, movePage } = useWorkspace();
  const page = workspace.pages.find((p) => p.id === pageId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(page?.folderId ?? null);

  if (!isOpen || !page) return null;

  const handleMove = () => {
    movePage(pageId, selectedFolderId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1e1e28] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
            Move "{page.name}"
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-500 mb-3">Select destination folder:</p>

        <div className="flex flex-col gap-1 mb-6 max-h-48 overflow-y-auto">
          {/* Root option */}
          <label className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
            selectedFolderId === null ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}>
            <input
              type="radio"
              name="folder"
              checked={selectedFolderId === null}
              onChange={() => setSelectedFolderId(null)}
              className="accent-brand-500"
            />
            <FolderOpen className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300">No folder (root)</span>
          </label>

          {workspace.folders.map((folder) => (
            <label
              key={folder.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                selectedFolderId === folder.id ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="folder"
                checked={selectedFolderId === folder.id}
                onChange={() => setSelectedFolderId(folder.id)}
                className="accent-brand-500"
              />
              <FolderOpen className="w-4 h-4 text-brand-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{folder.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
};
