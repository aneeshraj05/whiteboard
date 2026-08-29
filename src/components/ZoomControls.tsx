import React from 'react';
import { Minus, Plus, RotateCcw, RotateCw } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-2 pointer-events-auto select-none">
      {/* Zoom Pill */}
      <div className="flex items-center bg-white dark:bg-[#1e1e24] shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 rounded-xl p-1 text-slate-700 dark:text-slate-200">
        <button
          onClick={onZoomOut}
          title="Zoom Out (Ctrl -)"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset Zoom (Ctrl 0)"
          className="px-2 py-1 text-xs font-mono font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all min-w-[48px] text-center"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={onZoomIn}
          title="Zoom In (Ctrl +)"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Undo & Redo Pill */}
      <div className="flex items-center bg-white dark:bg-[#1e1e24] shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 rounded-xl p-1 text-slate-700 dark:text-slate-200">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded-lg transition-all ${
            canUndo
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
              : 'opacity-30 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 rounded-lg transition-all ${
            canRedo
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
              : 'opacity-30 cursor-not-allowed'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
