import React from 'react';
import {
  X,
  FolderOpen,
  Save,
  Download,
  Copy,
  Sun,
  Moon,
  Trash2,
  HelpCircle,
  Maximize2,
  LayoutGrid,
} from 'lucide-react';
import { WhiteboardElement } from '../types/whiteboard';
import { exportToJson, exportToPng, copyPngToClipboard } from '../utils/export';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  elements: WhiteboardElement[];
  onLoadElements: (elements: WhiteboardElement[]) => void;
  onClearCanvas: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  canvasBackground: string;
  onChangeCanvasBackground: (bg: string) => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  onOpenHelp: () => void;
  onResetZoom: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  elements,
  onLoadElements,
  onClearCanvas,
  theme,
  onToggleTheme,
  canvasBackground,
  onChangeCanvasBackground,
  gridEnabled,
  onToggleGrid,
  onOpenHelp,
  onResetZoom,
}) => {
  if (!isOpen) return null;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          onLoadElements(parsed.elements);
          onClose();
        } else if (Array.isArray(parsed)) {
          onLoadElements(parsed);
          onClose();
        } else {
          alert('Invalid whiteboard file format');
        }
      } catch (err) {
        alert('Failed to parse file');
      }
    };
    reader.readAsText(file);
  };

  const handleExportPng = () => {
    exportToPng(elements, { theme, backgroundColor: canvasBackground });
    onClose();
  };

  const handleCopyClipboard = async () => {
    const ok = await copyPngToClipboard(elements, { theme, backgroundColor: canvasBackground });
    if (ok) {
      alert('Copied image to clipboard!');
    } else {
      alert('Could not copy image to clipboard.');
    }
  };

  const handleSaveJson = () => {
    exportToJson(elements, { canvasBackground });
    onClose();
  };

  const bgColors = [
    '#ffffff',
    '#f8f9fa',
    '#f1f3f5',
    '#e7f5ff',
    '#ebfbee',
    '#fff9db',
    '#fff0f6',
    '#121212',
    '#1e1e24',
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#1e1e24] shadow-2xl z-10 flex flex-col p-5 overflow-y-auto animate-slideRight text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-500" />
            <h2 className="font-bold text-base tracking-wide">Menu</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleOpenFile}
          accept=".json,.whiteboard"
          className="hidden"
        />

        {/* Menu Items */}
        <div className="flex flex-col gap-1 py-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all group"
          >
            <span className="flex items-center gap-3">
              <FolderOpen className="w-4 h-4 text-slate-500 group-hover:text-brand-500" />
              Open File...
            </span>
            <span className="font-mono text-xs text-slate-400">Ctrl+O</span>
          </button>

          <button
            onClick={handleSaveJson}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all group"
          >
            <span className="flex items-center gap-3">
              <Save className="w-4 h-4 text-slate-500 group-hover:text-brand-500" />
              Save File (.json)
            </span>
            <span className="font-mono text-xs text-slate-400">Ctrl+S</span>
          </button>

          <button
            onClick={handleExportPng}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all group"
          >
            <span className="flex items-center gap-3">
              <Download className="w-4 h-4 text-slate-500 group-hover:text-brand-500" />
              Export Image (PNG)
            </span>
          </button>

          <button
            onClick={handleCopyClipboard}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all group"
          >
            <span className="flex items-center gap-3">
              <Copy className="w-4 h-4 text-slate-500 group-hover:text-brand-500" />
              Copy Image to Clipboard
            </span>
          </button>
        </div>

        <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

        {/* Canvas Preferences */}
        <div className="flex flex-col gap-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Canvas Background
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {bgColors.map((color) => (
              <button
                key={color}
                onClick={() => onChangeCanvasBackground(color)}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-md border transition-all ${
                  canvasBackground === color
                    ? 'ring-2 ring-brand-500 scale-110 border-transparent'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-sm font-medium transition-all mt-2"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span className="text-xs text-slate-500">Toggle</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={onToggleGrid}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-sm font-medium transition-all"
          >
            <span className="flex items-center gap-3">
              <LayoutGrid className="w-4 h-4 text-slate-500" />
              Background Grid
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {gridEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

        {/* Utilities & Help */}
        <div className="flex flex-col gap-1 py-2">
          <button
            onClick={() => {
              onResetZoom();
              onClose();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all"
          >
            <Maximize2 className="w-4 h-4 text-slate-500" />
            Reset Zoom (100%)
          </button>

          <button
            onClick={() => {
              onOpenHelp();
              onClose();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            Keyboard Shortcuts (?)
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear the entire whiteboard?')) {
                onClearCanvas();
                onClose();
              }
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium transition-all mt-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
