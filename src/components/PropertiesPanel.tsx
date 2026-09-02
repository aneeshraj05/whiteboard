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
  Group,
  Ungroup,
  RotateCw,
  Bold,
  Italic,
  Type,
  Minus,
  Plus,
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
  onGroup?: () => void;
  onUngroup?: () => void;
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
  onGroup,
  onUngroup,
}) => {
  if (selectedElements.length === 0) return null;

  const first = selectedElements[0];
  const isAllLocked = selectedElements.every((el) => el.isLocked);
  const hasGroupedElements = selectedElements.some((el) => !!el.groupId);
  const canGroup = selectedElements.length > 1;

  return (
    <aside className="absolute top-1.5 sm:top-2 left-3 sm:left-4 z-20 w-60 sm:w-64 max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar p-2.5 bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-md shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 rounded-2xl flex flex-col gap-2 text-xs select-none pointer-events-auto transition-all">
      {/* Header & Quick Operations */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-1 text-[11px]">
          {selectedElements.length === 1
            ? `${first.type.charAt(0).toUpperCase() + first.type.slice(1)}`
            : `${selectedElements.length} elements selected`}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Group / Ungroup buttons in Header */}
          {hasGroupedElements && onUngroup && (
            <button
              onClick={onUngroup}
              title="Ungroup (Ctrl+Shift+G)"
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-brand-600 dark:text-brand-400"
            >
              <Ungroup className="w-3.5 h-3.5" />
            </button>
          )}
          {canGroup && onGroup && (
            <button
              onClick={onGroup}
              title="Group (Ctrl+G)"
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-brand-600 dark:text-brand-400"
            >
              <Group className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onUpdateElementProps({ isLocked: !isAllLocked })}
            title={isAllLocked ? 'Unlock elements' : 'Lock elements'}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            {isAllLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDuplicate}
            title="Duplicate (Ctrl+D)"
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete (Del)"
            className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stroke / Text Color */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {first.type === 'text' ? 'Text Color' : 'Stroke'}
        </label>
        <div className="grid grid-cols-7 gap-1 items-center">
          {STROKE_COLORS.slice(0, 13).map((color) => (
            <button
              key={color}
              onClick={() => onUpdateElementProps({ strokeColor: color })}
              style={{ backgroundColor: color }}
              className={`w-5 h-5 rounded-md border transition-transform ${
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
            className="w-5 h-5 rounded-md cursor-pointer border-0 bg-transparent"
            title="Custom color"
          />
        </div>
      </div>

      {/* Text / Typography Panel (ONLY For Text Elements) */}
      {first.type === 'text' && (
        <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Type className="w-3 h-3 text-brand-500" />
              Typography & Style
            </span>
          </div>

          {/* Font Family Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Font</label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'Kalam', label: 'Casual', font: 'Kalam, cursive' },
                { id: 'Caveat', label: 'Script', font: 'Caveat, cursive' },
                { id: 'Architects Daughter', label: 'Architect', font: '"Architects Daughter", cursive' },
                { id: 'Inter', label: 'Clean', font: 'Inter, sans-serif' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdateElementProps({ fontFamily: f.id as any })}
                  style={{ fontFamily: f.font }}
                  className={`py-1 px-1.5 text-[11px] rounded-md border transition-all text-left truncate ${
                    (first.fontFamily || (first.type === 'text' ? 'Kalam' : 'Inter')) === f.id
                      ? 'bg-white dark:bg-slate-700 border-brand-500 text-brand-600 dark:text-brand-300 font-semibold shadow-xs'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size & Stepper */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Size</label>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{first.fontSize || (first.type === 'text' ? 22 : 16)}px</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Presets */}
              <div className="grid grid-cols-4 gap-0.5 flex-1 bg-slate-200/70 dark:bg-slate-700/60 p-0.5 rounded-lg">
                {[
                  { label: 'S', size: 16 },
                  { label: 'M', size: 22 },
                  { label: 'L', size: 32 },
                  { label: 'XL', size: 44 },
                ].map(({ label, size }) => (
                  <button
                    key={size}
                    onClick={() => onUpdateElementProps({ fontSize: size })}
                    className={`py-0.5 text-[10px] font-medium rounded transition-all ${
                      (first.fontSize || (first.type === 'text' ? 22 : 16)) === size
                        ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-300 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Stepper buttons */}
              <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-700/60 p-0.5 rounded-lg">
                <button
                  onClick={() => {
                    const current = first.fontSize || (first.type === 'text' ? 22 : 16);
                    onUpdateElementProps({ fontSize: Math.max(10, current - 2) });
                  }}
                  title="Decrease font size"
                  className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    const current = first.fontSize || (first.type === 'text' ? 22 : 16);
                    onUpdateElementProps({ fontSize: Math.min(96, current + 2) });
                  }}
                  title="Increase font size"
                  className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Boldness, Italic & Text Alignment */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Formatting</label>
            <div className="flex items-center justify-between gap-1">
              {/* Bold & Italic Toggles */}
              <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-700/60 p-0.5 rounded-lg">
                <button
                  onClick={() => {
                    const isBold = first.fontWeight === 'bold' || first.fontWeight === '700';
                    onUpdateElementProps({ fontWeight: isBold ? 'normal' : 'bold' });
                  }}
                  title="Bold (Ctrl+B)"
                  className={`p-1 rounded transition-all ${
                    first.fontWeight === 'bold' || first.fontWeight === '700'
                      ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const isItalic = first.fontStyle === 'italic';
                    onUpdateElementProps({ fontStyle: isItalic ? 'normal' : 'italic' });
                  }}
                  title="Italic (Ctrl+I)"
                  className={`p-1 rounded transition-all ${
                    first.fontStyle === 'italic'
                      ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-700/60 p-0.5 rounded-lg">
                {(['left', 'center', 'right'] as const).map((align) => {
                  const currentAlign = first.textAlign || (first.type === 'text' ? 'left' : 'center');
                  return (
                    <button
                      key={align}
                      onClick={() => onUpdateElementProps({ textAlign: align })}
                      title={`Align ${align}`}
                      className={`p-1 rounded transition-all ${
                        currentAlign === align
                          ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Fill Color (Shape Only) */}
      {first.type !== 'text' && first.type !== 'draw' && first.type !== 'line' && first.type !== 'arrow' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Background</label>
          <div className="grid grid-cols-7 gap-1 items-center">
            {BACKGROUND_COLORS.slice(0, 13).map((color) => (
              <button
                key={color}
                onClick={() => onUpdateElementProps({ backgroundColor: color })}
                style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-transform ${
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
              className="w-5 h-5 rounded-md cursor-pointer border-0 bg-transparent"
              title="Custom background color"
            />
          </div>
        </div>
      )}

      {/* Fill Style (Shape Only) */}
      {first.type !== 'text' && first.type !== 'draw' && first.type !== 'line' && first.type !== 'arrow' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Fill Style</label>
          <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['none', 'hachure', 'cross-hatch', 'solid'] as FillStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => onUpdateElementProps({ fillStyle: style })}
                className={`py-0.5 text-[10px] font-medium capitalize rounded transition-all ${
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

      {/* Stroke Width (Non-Text Only) */}
      {first.type !== 'text' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Stroke Width</label>
          <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
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
      )}

      {/* Stroke Style (Non-Text Only) */}
      {first.type !== 'text' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Stroke Style</label>
          <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => onUpdateElementProps({ strokeStyle: style })}
                className={`py-0.5 text-[10px] capitalize rounded transition-all ${
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
      )}

      {/* Sloppiness / Roughness (Non-Text Only) */}
      {first.type !== 'text' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Sloppiness</label>
          <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { level: 0 as RoughnessLevel, label: 'Architect' },
              { level: 1 as RoughnessLevel, label: 'Artist' },
              { level: 2 as RoughnessLevel, label: 'Cartoonist' },
            ].map(({ level, label }) => (
              <button
                key={level}
                onClick={() => onUpdateElementProps({ roughness: level })}
                className={`py-0.5 text-[10px] rounded transition-all ${
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
      )}

      {/* Edges / Corners (Rectangle Only) */}
      {first.type === 'rectangle' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Edges</label>
          <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => onUpdateElementProps({ roundness: false })}
              className={`py-0.5 text-[10px] rounded transition-all ${
                !first.roundness
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sharp
            </button>
            <button
              onClick={() => onUpdateElementProps({ roundness: true })}
              className={`py-0.5 text-[10px] rounded transition-all ${
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
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
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

      {/* Rotation & Angle */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <span>Rotation</span>
          <span>{Math.round(((first.angle || 0) * 180) / Math.PI) % 360}°</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const cur = first.angle || 0;
              const next = (cur + Math.PI / 2) % (Math.PI * 2);
              onUpdateElementProps({ angle: next });
            }}
            title="Rotate 90° Clockwise"
            className="flex-1 py-0.5 px-1.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300"
          >
            <RotateCw className="w-3 h-3" />
            <span>+90°</span>
          </button>
          <button
            onClick={() => onUpdateElementProps({ angle: 0 })}
            title="Reset Rotation to 0°"
            className="py-0.5 px-1.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Layers */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Layers</label>
        <div className="grid grid-cols-4 gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            onClick={onSendToBack}
            title="Send to Back (Ctrl+[)"
            className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onSendBackward}
            title="Send Backward"
            className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBringForward}
            title="Bring Forward"
            className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBringToFront}
            title="Bring to Front (Ctrl+])"
            className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Align (when multiple elements selected) */}
      {selectedElements.length > 1 && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Align</label>
          <div className="grid grid-cols-6 gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => onAlign('left')}
              title="Align Left"
              className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('center')}
              title="Align Center"
              className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('right')}
              title="Align Right"
              className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('top')}
              title="Align Top"
              className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('middle')}
              title="Align Middle"
              className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('bottom')}
              title="Align Bottom"
              className="p-1 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
