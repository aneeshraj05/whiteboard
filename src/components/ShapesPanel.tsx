import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { ToolType } from '../types/whiteboard';
import { shapeRegistry, SHAPE_CATEGORIES } from '../utils/shapeRegistry';

interface ShapesPanelProps {
  /** The button element the panel is anchored to */
  anchorRect: DOMRect | null;
  activeTool: ToolType;
  onSelectShape: (id: ToolType) => void;
  onClose: () => void;
}

const PANEL_WIDTH = 232;
const PANEL_MAX_HEIGHT = 480;
const GAP = 6; // px gap between anchor and panel

export const ShapesPanel: React.FC<ShapesPanelProps> = ({
  anchorRect,
  activeTool,
  onSelectShape,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Compute position after mount / anchorRect change
  useLayoutEffect(() => {
    if (!anchorRect) return;

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Default: open below
    let top = anchorRect.bottom + GAP;
    let left = anchorRect.left + anchorRect.width / 2 - PANEL_WIDTH / 2;

    // Flip above if not enough room below
    if (top + PANEL_MAX_HEIGHT > vh - 8) {
      top = anchorRect.top - GAP - Math.min(PANEL_MAX_HEIGHT, vh - 16);
    }

    // Clamp horizontal so panel stays within viewport
    if (left + PANEL_WIDTH > vw - 8) left = vw - PANEL_WIDTH - 8;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [anchorRect]);

  // Close on Escape or click-outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Also exclude clicks on the anchor button itself (handled by toggle)
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    // Use mousedown so the panel closes before any other click handler runs
    window.addEventListener('mousedown', handleClick, true);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick, true);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed z-[200] select-none pointer-events-auto"
      style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
    >
      <div
        className="bg-white dark:bg-[#1e1e24] border border-slate-200/90 dark:border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: PANEL_MAX_HEIGHT }}
      >
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-3">
          {SHAPE_CATEGORIES.map((cat) => {
            const shapes = shapeRegistry.filter((s) => s.category === cat.id);
            if (shapes.length === 0) return null;
            return (
              <div key={cat.id}>
                {/* Category label */}
                <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {cat.label}
                </div>
                {/* Shape grid — 5 per row */}
                <div className="grid grid-cols-5 gap-0.5">
                  {shapes.map((shape) => {
                    const isActive = activeTool === shape.id;
                    return (
                      <button
                        key={shape.id}
                        title={shape.label}
                        onPointerDown={(e) => {
                          e.preventDefault(); // Prevent touch-to-mouse translation issues
                          e.stopPropagation();
                          onSelectShape(shape.id);
                        }}
                        className={`
                          flex items-center justify-center w-9 h-9 rounded-lg transition-all
                          ${isActive
                            ? 'bg-[#5b5fc7] text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
                          }
                        `}
                      >
                        {shape.icon()}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
