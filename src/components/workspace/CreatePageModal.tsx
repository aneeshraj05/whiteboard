import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, PenTool } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PageMode } from '../../types/workspace';

interface CreatePageModalProps {
  isOpen: boolean;
  defaultMode?: PageMode;
  defaultFolderId?: string | null;
  onClose: () => void;
}

export const CreatePageModal: React.FC<CreatePageModalProps> = ({
  isOpen,
  defaultMode = 'notes',
  defaultFolderId = null,
  onClose,
}) => {
  const { workspace, createPage } = useWorkspace();
  const [name, setName] = useState('Untitled');
  const [mode, setMode] = useState<PageMode>(defaultMode);
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('Untitled');
      setMode(defaultMode);
      setFolderId(defaultFolderId);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, defaultMode, defaultFolderId]);

  if (!isOpen) return null;

  const handleCreate = () => {
    const trimmed = name.trim() || 'Untitled';
    createPage(trimmed, mode, folderId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1e1e28] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Create new page</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Page Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Page name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/40 transition"
              placeholder="Untitled"
            />
          </div>

          {/* Mode Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Choose mode
            </label>
            <div className="flex gap-2">
              {(['notes', 'drawing'] as PageMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 text-sm font-medium rounded-lg border transition-all ${
                    mode === m
                      ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {m === 'notes'
                    ? <FileText className="w-5 h-5" />
                    : <PenTool className="w-5 h-5" />}
                  <span className="capitalize">{m === 'notes' ? 'Notes' : 'Drawing'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Folder Selector */}
          {workspace.folders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Folder
              </label>
              <select
                value={folderId ?? ''}
                onChange={(e) => setFolderId(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/40 transition"
              >
                <option value="">No folder (root)</option>
                {workspace.folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
