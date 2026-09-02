import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  FileText,
  PenTool,
  Star,
  Edit2,
  Copy,
  Trash2,
} from 'lucide-react';
import { ToolType, BackgroundPattern } from '../types/whiteboard';
import { ShapesPanel } from './ShapesPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import { MovePageModal } from './workspace/MovePageModal';
import { ConfirmModal } from './workspace/ConfirmModal';

interface TopNavProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  isToolLocked: boolean;
  setIsToolLocked: (locked: boolean | ((prev: boolean) => boolean)) => void;
  onOpenShare: () => void;
  onImageUploadClick: () => void;
  backgroundPattern: BackgroundPattern;
  onChangeBackgroundPattern: (pat: BackgroundPattern) => void;
}

// ─── More Menu (same as NotesMode) ─────────────────────────────────────────

interface MoreMenuProps {
  onDuplicate: () => void;
  onMove: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  onDelete: () => void;
  onClose: () => void;
}

const PageMoreMenu: React.FC<MoreMenuProps> = ({
  onDuplicate, onMove, onFavorite, isFavorite, onDelete, onClose
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const items = [
    { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: onDuplicate },
    { label: 'Move', icon: <ArrowRight className="w-3.5 h-3.5" />, onClick: onMove },
    { label: isFavorite ? 'Unfavorite' : 'Favorite', icon: <Star className="w-3.5 h-3.5" />, onClick: onFavorite },
    { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#1e1e28] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-fadeIn"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
            item.danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};

// ─── TopNav ────────────────────────────────────────────────────────────────

export const TopNav: React.FC<TopNavProps> = ({
  activeTool,
  setActiveTool,
  isToolLocked,
  setIsToolLocked,
  onOpenShare,
  onImageUploadClick,
  backgroundPattern,
  onChangeBackgroundPattern,
}) => {
  const { activePage, sidebarOpen, setSidebarOpen, changePageMode, toggleFavorite, duplicatePage, deletePage } = useWorkspace();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPatternMenuOpen, setIsPatternMenuOpen] = useState(false);
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [shapesAnchorRect, setShapesAnchorRect] = useState<DOMRect | null>(null);
  const [showPageMoreMenu, setShowPageMoreMenu] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const patternMenuRef = useRef<HTMLDivElement>(null);
  const shapesButtonRef = useRef<HTMLButtonElement>(null);

  // ── Set of shape tool IDs ──
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (patternMenuRef.current && !patternMenuRef.current.contains(target)) {
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
      {/* ── Solid Top Bar (matching NotesMode) ─────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/60 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md shrink-0 z-30 select-none">

        {/* ── Left: Hamburger + Mode Switcher ── */}
        <div className="flex items-center gap-2 shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          {activePage && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => changePageMode(activePage.id, 'drawing')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              >
                <PenTool className="w-3.5 h-3.5" />
                Drawing
              </button>
              <button
                onClick={() => changePageMode(activePage.id, 'notes')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <FileText className="w-3.5 h-3.5" />
                Notes
              </button>
            </div>
          )}
        </div>

        {/* ── Center: Drawing Toolbar ── */}
        <div className="flex items-center gap-1">
          {/* Lock Tool */}
          <button
            onClick={() => setIsToolLocked((prev) => !prev)}
            title={isToolLocked ? 'Keep selected tool active (Locked)' : 'Unlock tool'}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
              isToolLocked
                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isToolLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-50" />}
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

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
                className={`relative p-1.5 rounded-lg transition-all flex items-center justify-center ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            );
          })}

          {/* More Tools Overflow Dropdown */}
          <div ref={moreMenuRef} className="relative">
            <button
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              title="Extra Tools"
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                activeTool === 'laser' || isMoreMenuOpen
                  ? 'bg-pink-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#1e1e24] shadow-2xl border border-slate-200/90 dark:border-slate-800 rounded-xl p-1.5 z-50 flex flex-col gap-1 text-xs animate-fadeIn">
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

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Shapes Button */}
          <button
            ref={shapesButtonRef}
            onClick={toggleShapes}
            title="Shapes"
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
              isShapesOpen || isShapeTool
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
            }`}
          >
            <Shapes className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Background Pattern Selector */}
          <div ref={patternMenuRef} className="relative">
            <button
              onClick={() => setIsPatternMenuOpen((prev) => !prev)}
              title="Canvas Background Pattern"
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                isPatternMenuOpen
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            {isPatternMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#1e1e24] shadow-2xl border border-slate-200/90 dark:border-slate-800 rounded-xl p-1.5 z-50 flex flex-col gap-0.5 text-xs animate-fadeIn">
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
        </div>

        {/* ── Right: Unified Actions (Favorite, Share, More) ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activePage && (
            <>
              <button
                onClick={() => toggleFavorite(activePage.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  activePage.favorite
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${activePage.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                {activePage.favorite ? 'Favorited' : 'Favorite'}
              </button>

              <button
                onClick={onOpenShare}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowPageMoreMenu((p) => !p)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showPageMoreMenu && (
                  <PageMoreMenu
                    onDuplicate={() => duplicatePage(activePage.id)}
                    onMove={() => setShowMoveModal(true)}
                    onFavorite={() => toggleFavorite(activePage.id)}
                    isFavorite={activePage.favorite}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onClose={() => setShowPageMoreMenu(false)}
                  />
                )}
              </div>
            </>
          )}
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

      {/* Modals */}
      {activePage && showMoveModal && (
        <MovePageModal
          isOpen={showMoveModal}
          pageId={activePage.id}
          onClose={() => setShowMoveModal(false)}
        />
      )}
      {activePage && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete page?"
          message={`Delete "${activePage.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => { deletePage(activePage.id); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};
