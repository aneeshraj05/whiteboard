import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  Menu,
  Lock,
  Unlock,
  Hand,
  MousePointer2,
  LassoSelect,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image as ImageIcon,
  Eraser,
  Sparkles,
  Share2,
  LayoutGrid,
  MoreHorizontal,
  Shapes,
} from 'lucide-react';
import { ToolType, BackgroundPattern } from '../types/whiteboard';
import { ShapesPanel } from './ShapesPanel';

interface TopNavProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  isToolLocked: boolean;
  setIsToolLocked: (locked: boolean | ((prev: boolean) => boolean)) => void;
  onOpenMenu: () => void;
  onOpenShare: () => void;
  onImageUploadClick: () => void;
  backgroundPattern: BackgroundPattern;
  onChangeBackgroundPattern: (pat: BackgroundPattern) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTool,
  setActiveTool,
  isToolLocked,
  setIsToolLocked,
  onOpenMenu,
  onOpenShare,
  onImageUploadClick,
  backgroundPattern,
  onChangeBackgroundPattern,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPatternMenuOpen, setIsPatternMenuOpen] = useState(false);
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [shapesAnchorRect, setShapesAnchorRect] = useState<DOMRect | null>(null);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const patternMenuRef = useRef<HTMLDivElement>(null);
  const shapesButtonRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ── Set of shape tool IDs (so we can highlight the Shapes button when active) ──
  const SHAPE_TOOL_IDS: Set<ToolType> = new Set([
    'rounded-rectangle', 'triangle', 'right-triangle', 'pentagon',
    'hexagon', 'octagon', 'star', 'burst',
    'double-arrow', 'curved-arrow', 'elbow-connector', 'dashed-arrow',
    'process', 'decision', 'input-output', 'document', 'database',
    'terminator', 'predefined-process', 'manual-input', 'delay',
    'cloud', 'cylinder', 'folder', 'server', 'person',
    'message', 'speech-bubble', 'callout',
  ]);
  const isShapeTool = SHAPE_TOOL_IDS.has(activeTool);

  // Close dropdowns on outside click (excluding shapes panel — it self-manages)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (patternMenuRef.current && !patternMenuRef.current.contains(e.target as Node)) {
        setIsPatternMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openShapesPanel = useCallback(() => {
    if (shapesButtonRef.current) {
      setShapesAnchorRect(shapesButtonRef.current.getBoundingClientRect());
    }
    setIsShapesOpen(true);
  }, []);

  const closeShapesPanel = useCallback(() => {
    setIsShapesOpen(false);
    setShapesAnchorRect(null);
  }, []);

  const toggleShapes = useCallback(() => {
    if (isShapesOpen) {
      closeShapesPanel();
    } else {
      openShapesPanel();
    }
  }, [isShapesOpen, openShapesPanel, closeShapesPanel]);

  const primaryTools: { id: ToolType; icon: React.FC<any>; label: string; shortcut: string }[] = [
    { id: 'pan', icon: Hand, label: 'Hand (Pan)', shortcut: 'H' },
    { id: 'selection', icon: MousePointer2, label: 'Selection', shortcut: '1' },
    { id: 'lasso', icon: LassoSelect, label: 'Lasso Selection', shortcut: 'V' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: '2' },
    { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: '3' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: '4' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: '5' },
    { id: 'line', icon: Minus, label: 'Line', shortcut: '6' },
    { id: 'draw', icon: Pencil, label: 'Draw / Freehand', shortcut: '7' },
    { id: 'text', icon: Type, label: 'Text', shortcut: '8' },
    { id: 'image', icon: ImageIcon, label: 'Insert Image', shortcut: '9' },
    { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: '0' },
  ];

  const patterns: { id: BackgroundPattern; label: string }[] = [
    { id: 'blank', label: 'Blank Canvas' },
    { id: 'dotted', label: 'Dotted Grid' },
    { id: 'fine-dotted', label: 'Fine Dotted' },
    { id: 'grid', label: 'Square Grid' },
    { id: 'large-grid', label: 'Large Grid' },
    { id: 'notebook', label: 'Notebook / Ruled' },
    { id: 'graph-paper', label: 'Graph Paper' },
    { id: 'isometric', label: 'Isometric Grid' },
  ];

  return (
    <>
      <header className="fixed top-2 sm:top-3 inset-x-0 z-30 px-3 sm:px-4 pointer-events-none select-none">
        <div className="relative flex items-center justify-between w-full max-w-[1920px] mx-auto min-h-[44px]">

          {/* Top Left Menu Button */}
          <div className="flex items-center gap-2 pointer-events-auto z-10">
            <button
              onClick={onOpenMenu}
              title="Menu & Preferences"
              className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#1e1e24] text-slate-700 dark:text-slate-200 shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* ── Center region: Toolbar + Shapes button ── */}
          {/*
            The toolbar is absolutely centered (left-1/2 -translate-x-1/2).
            The Shapes button is rendered immediately after it in a wrapper
            that is also absolutely positioned, offset from the toolbar's
            right edge using a ResizeObserver-measured width.
          */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-auto">

            {/* ── Main Toolbar ── */}
            <div
              ref={toolbarRef}
              className="flex items-center gap-0.5 sm:gap-1 p-1 bg-white dark:bg-[#1e1e24] shadow-panel dark:shadow-panel-dark border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-visible"
            >
              {/* Lock Tool */}
              <button
                onClick={() => setIsToolLocked((prev) => !prev)}
                title={isToolLocked ? 'Keep selected tool active (Locked)' : 'Unlock tool'}
                className={`p-1.5 sm:p-2 rounded-lg transition-all flex items-center justify-center ${
                  isToolLocked
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isToolLocked ? <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50" />}
              </button>

              <div className="w-[1px] h-4 sm:h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Primary Drawing Tools */}
              {primaryTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;

                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'image') {
                        onImageUploadClick();
                      } else {
                        setActiveTool(tool.id);
                      }
                    }}
                    title={`${tool.label} (${tool.shortcut})`}
                    className={`relative p-1.5 sm:p-2 rounded-lg transition-all flex items-center justify-center ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                    <span className="hidden md:inline absolute -bottom-1 -right-0.5 text-[8px] font-mono leading-none opacity-40 font-bold">
                      {tool.shortcut}
                    </span>
                  </button>
                );
              })}

              {/* More Tools Overflow Dropdown */}
              <div ref={moreMenuRef} className="relative overflow-visible">
                <button
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  title="Extra Tools"
                  className={`p-1.5 sm:p-2 rounded-lg transition-all flex items-center justify-center ${
                    activeTool === 'laser' || isMoreMenuOpen
                      ? 'bg-pink-500 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-48 bg-white dark:bg-[#1e1e24] shadow-2xl border border-slate-200/90 dark:border-slate-800 rounded-xl p-1.5 z-50 flex flex-col gap-1 text-xs animate-fadeIn pointer-events-auto">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Extra Tools
                    </div>
                    <button
                      onClick={() => {
                        setActiveTool('laser');
                        setIsMoreMenuOpen(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                        activeTool === 'laser'
                          ? 'bg-pink-500 text-white font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-pink-500" />
                      <span>Laser Pointer</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Shapes Button — immediately right of toolbar ── */}
            <button
              ref={shapesButtonRef}
              onClick={toggleShapes}
              title="Shapes"
              className={`
                p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center
                ${isShapesOpen || isShapeTool
                  ? 'bg-[#5b5fc7] text-white border-[#5b5fc7] shadow-sm shadow-[#5b5fc7]/30'
                  : 'bg-white dark:bg-[#1e1e24] text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 shadow-panel dark:shadow-panel-dark hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95'
                }
              `}
            >
              <Shapes className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto z-10">
            {/* Background Pattern Selector */}
            <div ref={patternMenuRef} className="relative overflow-visible">
              <button
                onClick={() => setIsPatternMenuOpen((prev) => !prev)}
                title="Canvas Background Pattern"
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-panel dark:shadow-panel-dark bg-white dark:bg-[#1e1e24] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {isPatternMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#1e1e24] shadow-2xl border border-slate-200/90 dark:border-slate-800 rounded-xl p-1.5 z-50 flex flex-col gap-0.5 text-xs animate-fadeIn pointer-events-auto">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Canvas Pattern
                  </div>
                  {patterns.map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => {
                        onChangeBackgroundPattern(pat.id);
                        setIsPatternMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                        backgroundPattern === pat.id
                          ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{pat.label}</span>
                      {backgroundPattern === pat.id && <span className="text-brand-500 font-bold">•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Share Action */}
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-[#5b5fc7] hover:bg-[#4b4fb0] active:scale-95 shadow-sm rounded-xl transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* Shapes Panel — rendered in a portal-like fixed overlay, outside the header */}
      {isShapesOpen && shapesAnchorRect && (
        <ShapesPanel
          anchorRect={shapesAnchorRect}
          activeTool={activeTool}
          onSelectShape={(id) => {
            setActiveTool(id);
            closeShapesPanel();
          }}
          onClose={closeShapesPanel}
        />
      )}
    </>
  );
};
