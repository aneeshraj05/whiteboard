import React from 'react';
import {
  WhiteboardElement,
  FillStyle,
  StrokeStyle,
  RoughnessLevel,
  StrokeWidth,
  STROKE_COLORS,
  BACKGROUND_COLORS,
} from '../types/whiteboard';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalSpaceAround,
  Slash,
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedElements: WhiteboardElement[];
  onUpdateElementProps: (props: Partial<WhiteboardElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onAlign: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElements,
  onUpdateElementProps,
  onDuplicate,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onAlign,
}) => {
  if (selectedElements.length === 0) return null;

  const first = selectedElements[0];
  const isAllLocked = selectedElements.every((el) => el.isLocked);

  return (
    <aside className="fixed top-14 sm:top-16 left-3 sm:left-4 z-20 w-60 sm:w-64 max-h-[calc(100vh-5.5rem)] overflow-y-auto p-3 sm:p-3.5 bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-md shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 rounded-2xl flex flex-col gap-3.5 text-xs select-none pointer-events-auto transition-all">
      {/* Header & Quick Operations */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
          {selectedElements.length === 1
            ? `${first.type.charAt(0).toUpperCase() + first.type.slice(1)}`
            : `${selectedElements.length} elements selected`}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onUpdateElementProps({ isLocked: !isAllLocked })}
            title={isAllLocked ? 'Unlock elements' : 'Lock elements'}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            {isAllLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDuplicate}
            title="Duplicate (Ctrl+D)"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete (Del)"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stroke Color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Stroke</label>
        <div className="grid grid-cols-7 gap-1.5 items-center">
          {STROKE_COLORS.slice(0, 13).map((color) => (
            <button
              key={color}
              onClick={() => onUpdateElementProps({ strokeColor: color })}
              style={{ backgroundColor: color }}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border transition-transform ${
                first.strokeColor === color
                  ? 'ring-2 ring-brand-500 scale-110 border-white'
                  : 'border-slate-300 dark:border-slate-700 hover:scale-105'
              }`}
            />
          ))}
          <input
            type="color"
            value={first.strokeColor.startsWith('#') ? first.strokeColor : '#1e1e1e'}
            onChange={(e) => onUpdateElementProps({ strokeColor: e.target.value })}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md cursor-pointer border-0 bg-transparent"
            title="Custom stroke color"
          />
        </div>
      </div>

      {/* Background Fill Color */}
      {first.type !== 'draw' && first.type !== 'line' && first.type !== 'arrow' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Background</label>
          <div className="grid grid-cols-7 gap-1.5 items-center">
            {BACKGROUND_COLORS.slice(0, 13).map((color) => (
              <button
                key={color}
                onClick={() => onUpdateElementProps({ backgroundColor: color })}
                style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border flex items-center justify-center transition-transform ${
                  first.backgroundColor === color
                    ? 'ring-2 ring-brand-500 scale-110 border-white'
                    : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                }`}
              >
                {color === 'transparent' && <Slash className="w-3 h-3 text-red-500" />}
              </button>
            ))}
            <input
              type="color"
              value={first.backgroundColor.startsWith('#') ? first.backgroundColor : '#ffc9c9'}
              onChange={(e) => onUpdateElementProps({ backgroundColor: e.target.value })}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md cursor-pointer border-0 bg-transparent"
              title="Custom background color"
            />
          </div>
        </div>
      )}

      {/* Fill Style */}
      {first.type !== 'draw' && first.type !== 'line' && first.type !== 'arrow' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Fill Style</label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['none', 'hachure', 'cross-hatch', 'solid'] as FillStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => onUpdateElementProps({ fillStyle: style })}
                className={`py-1 text-[10px] font-medium capitalize rounded transition-all ${
                  first.fillStyle === style
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {style === 'none' ? 'Hollow' : style === 'hachure' ? 'Hachure' : style === 'cross-hatch' ? 'Cross' : 'Solid'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Stroke Width</label>
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {([1, 2, 4, 6] as StrokeWidth[]).map((width) => (
            <button
              key={width}
              onClick={() => onUpdateElementProps({ strokeWidth: width })}
              className={`py-1 text-[10px] flex items-center justify-center rounded transition-all ${
                first.strokeWidth === width
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <div
                className="bg-current rounded-full"
                style={{ width: 14, height: width }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Style */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Stroke Style</label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => onUpdateElementProps({ strokeStyle: style })}
              className={`py-1 text-[10px] capitalize rounded transition-all ${
                first.strokeStyle === style
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Sloppiness / Roughness */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sloppiness</label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {[
            { level: 0 as RoughnessLevel, label: 'Architect' },
            { level: 1 as RoughnessLevel, label: 'Artist' },
            { level: 2 as RoughnessLevel, label: 'Cartoonist' },
          ].map(({ level, label }) => (
            <button
              key={level}
              onClick={() => onUpdateElementProps({ roughness: level })}
              className={`py-1 text-[10px] rounded transition-all ${
                first.roughness === level
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Edges / Corners */}
      {first.type === 'rectangle' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Edges</label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => onUpdateElementProps({ roundness: false })}
              className={`py-1 text-[10px] rounded transition-all ${
                !first.roundness
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sharp
            </button>
            <button
              onClick={() => onUpdateElementProps({ roundness: true })}
              className={`py-1 text-[10px] rounded transition-all ${
                first.roundness
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Round
            </button>
          </div>
        </div>
      )}

      {/* Opacity Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>Opacity</span>
          <span>{first.opacity ?? 100}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          value={first.opacity ?? 100}
          onChange={(e) => onUpdateElementProps({ opacity: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
      </div>

      {/* Layers */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Layers</label>
        <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={onSendToBack}
            title="Send to Back (Ctrl+[)"
            className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onSendBackward}
            title="Send Backward"
            className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBringForward}
            title="Bring Forward"
            className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBringToFront}
            title="Bring to Front (Ctrl+])"
            className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Align (when multiple elements selected) */}
      {selectedElements.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Align</label>
          <div className="grid grid-cols-6 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => onAlign('left')}
              title="Align Left"
              className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('center')}
              title="Align Center"
              className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('right')}
              title="Align Right"
              className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('top')}
              title="Align Top"
              className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('middle')}
              title="Align Middle"
              className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('bottom')}
              title="Align Bottom"
              className="p-1.5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
