import React, { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import {
  WhiteboardElement,
  ToolType,
  Point,
  ResizeHandle,
  DragState,
  LaserPoint,
  StrokeWidth,
  FillStyle,
  StrokeStyle,
  RoughnessLevel,
  BackgroundPattern,
} from '../types/whiteboard';
import {
  screenToWorld,
  worldToScreen,
  getElementBounds,
  getCombinedBounds,
  isPointInsideElement,
  getHitHandle,
  isElementIntersectingBox,
  isElementInsideLasso,
  HANDLE_SIZE,
  measureTextDimensions,
} from '../utils/math';
import {
  renderElement,
  drawSelectionBox,
  drawMarqueeBox,
  drawSmoothLasso,
  drawCanvasPattern,
  drawLaserTrail,
} from '../utils/roughRenderer';

interface WhiteboardCanvasProps {
  elements: WhiteboardElement[];
  setElements: (
    action: WhiteboardElement[] | ((prev: WhiteboardElement[]) => WhiteboardElement[]),
    saveHistory?: boolean
  ) => void;
  selectedElementIds: string[];
  setSelectedElementIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  isToolLocked: boolean;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  scrollX: number;
  setScrollX: React.Dispatch<React.SetStateAction<number>>;
  scrollY: number;
  setScrollY: React.Dispatch<React.SetStateAction<number>>;
  theme: 'light' | 'dark';
  canvasBackground: string;
  backgroundPattern: BackgroundPattern;
  defaultStrokeColor: string;
  defaultBackgroundColor: string;
  defaultFillStyle: FillStyle;
  defaultStrokeWidth: StrokeWidth;
  defaultStrokeStyle: StrokeStyle;
  defaultRoughness: RoughnessLevel;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  elements,
  setElements,
  selectedElementIds,
  setSelectedElementIds,
  activeTool,
  setActiveTool,
  isToolLocked,
  zoom,
  setZoom,
  scrollX,
  setScrollX,
  scrollY,
  setScrollY,
  theme,
  canvasBackground,
  backgroundPattern,
  defaultStrokeColor,
  defaultBackgroundColor,
  defaultFillStyle,
  defaultStrokeWidth,
  defaultStrokeStyle,
  defaultRoughness,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [dragState, setDragState] = useState<DragState>({
    type: 'none',
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Laser trail stored in a ref to avoid React re-render jank
  const laserTrailRef = useRef<LaserPoint[]>([]);
  const [laserTrail, setLaserTrail] = useState<LaserPoint[]>([]);
  const laserRafRef = useRef<number | null>(null);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextVal, setEditingTextVal] = useState<string>('');
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Auto focus textarea whenever entering edit mode
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingTextId]);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setIsSpacePressed(true);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Commit text editing helper
  const handleCommitText = useCallback(() => {
    if (!editingTextId) return;
    const targetId = editingTextId;
    const val = editingTextVal;

    if (!val || !val.trim()) {
      setElements((prev) => prev.filter((el) => el.id !== targetId), true);
      setSelectedElementIds((prev) => prev.filter((id) => id !== targetId));
    } else {
      setElements(
        (prev) =>
          prev.map((el) => {
            if (el.id !== targetId) return el;
            const fontSize = el.fontSize || 22;
            const fontFamily = el.fontFamily || 'Kalam';
            
            // For explicitly drawn fixed-width text boxes, we could preserve width and only update height.
            // But since the current implementation does auto-sizing, we'll auto-size both unless el.type isn't 'text'
            const dims = measureTextDimensions(val, fontSize, fontFamily);

            return {
              ...el,
              text: val,
              width: el.type === 'text' ? Math.max(dims.width, el.width) : el.width,
              height: el.type === 'text' ? dims.height : el.height,
              updatedAt: Date.now(),
            };
          }),
        true
      );
    }
    setEditingTextId(null);
    setEditingTextVal('');
  }, [editingTextId, editingTextVal, setElements, setSelectedElementIds]);

  // Request Animation Frame Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear canvas background
    ctx.fillStyle = canvasBackground || (theme === 'dark' ? '#121212' : '#ffffff');
    ctx.fillRect(0, 0, width, height);

    // Draw Configured Background Pattern
    drawCanvasPattern(ctx, width, height, scrollX, scrollY, zoom, backgroundPattern, theme === 'dark');

    // Apply viewport transformation (Pan & Zoom)
    ctx.save();
    ctx.translate(scrollX, scrollY);
    ctx.scale(zoom, zoom);

    const rc = rough.canvas(canvas);

    // Draw Elements
    for (const element of elements) {
      if (element.id === editingTextId) continue;
      renderElement(rc, ctx, element, () => render());
    }

    // Draw Rectangular Marquee Selection Box
    if (dragState.type === 'selecting' && dragState.selectionBox) {
      drawMarqueeBox(ctx, dragState.selectionBox, zoom);
    }

    // Draw Smooth Lasso Selection Boundary
    if (dragState.type === 'lasso' && dragState.lassoPoints && dragState.lassoPoints.length > 1) {
      drawSmoothLasso(ctx, dragState.lassoPoints, zoom);
    }

    // Draw Selection Bounding Box & Handles
    if (selectedElementIds.length > 0 && dragState.type !== 'drawing' && dragState.type !== 'lasso') {
      const selectedEls = elements.filter((el) => selectedElementIds.includes(el.id) && el.id !== editingTextId);
      if (selectedEls.length > 0) {
        const combinedBounds = getCombinedBounds(selectedEls);
        if (combinedBounds) {
          drawSelectionBox(ctx, combinedBounds, zoom, selectedEls.length === 1);
        }
      }
    }

    // Draw Laser Trail
    if (laserTrail.length > 0) {
      drawLaserTrail(ctx, laserTrail, zoom);
    }

    ctx.restore(); // Restore pan/zoom
    ctx.restore(); // Restore dpr
  }, [
    elements,
    selectedElementIds,
    zoom,
    scrollX,
    scrollY,
    theme,
    canvasBackground,
    backgroundPattern,
    dragState,
    laserTrail,
    editingTextId,
  ]);

  // Render loop — always runs once per frame when laser is active,
  // driven by a persistent RAF that we manage via ref to avoid stale closures.
  useEffect(() => {
    render();
  }, [render]);

  // Dedicated smooth laser RAF loop (independent of React render cycle)
  const startLaserLoop = useCallback(() => {
    if (laserRafRef.current !== null) return; // already running
    const loop = () => {
      const now = Date.now();
      const filtered = laserTrailRef.current.filter((p) => now - p.time < 800);
      laserTrailRef.current = filtered;
      setLaserTrail([...filtered]); // sync to state for render
      if (filtered.length > 0) {
        laserRafRef.current = requestAnimationFrame(loop);
      } else {
        laserRafRef.current = null;
      }
    };
    laserRafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopLaserLoop = useCallback(() => {
    if (laserRafRef.current !== null) {
      cancelAnimationFrame(laserRafRef.current);
      laserRafRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopLaserLoop(), [stopLaserLoop]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Screen to world converter helper
  const getWorldCoords = (e: React.PointerEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return screenToWorld(screenX, screenY, scrollX, scrollY, zoom);
  };

  // POINTER DOWN
  const handlePointerDown = (e: React.PointerEvent) => {
    // If text edit is active and the click didn't come from the textarea, commit
    if (editingTextId) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.closest('[data-text-editor]')) return;
      handleCommitText();
    }

    // Pan with middle click, Space + drag, or Hand tool
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setDragState({
        type: 'panning',
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
      return;
    }

    if (e.button !== 0) return; // Only primary mouse button

    const worldPt = getWorldCoords(e);

    // Laser pointer
    if (activeTool === 'laser') {
      const firstPoint = { x: worldPt.x, y: worldPt.y, time: Date.now() };
      laserTrailRef.current = [firstPoint];
      setLaserTrail([firstPoint]);
      startLaserLoop();
      setDragState({
        type: 'drawing',
        startX: worldPt.x,
        startY: worldPt.y,
        currentX: worldPt.x,
        currentY: worldPt.y,
      });
      return;
    }

    // Eraser Tool
    if (activeTool === 'eraser') {
      const hit = elements.find((el) => isPointInsideElement(worldPt.x, worldPt.y, el));
      if (hit) {
        setElements((prev) => prev.filter((el) => el.id !== hit.id), true);
        setSelectedElementIds((prev) => prev.filter((id) => id !== hit.id));
      }
      setDragState({
        type: 'erasing',
        startX: worldPt.x,
        startY: worldPt.y,
        currentX: worldPt.x,
        currentY: worldPt.y,
      });
      return;
    }

    // Lasso Selection Tool
    if (activeTool === 'lasso') {
      if (!e.shiftKey) {
        setSelectedElementIds([]);
      }
      setDragState({
        type: 'lasso',
        startX: worldPt.x,
        startY: worldPt.y,
        currentX: worldPt.x,
        currentY: worldPt.y,
        lassoPoints: [worldPt],
      });
      return;
    }

    // Selection Tool
    if (activeTool === 'selection') {
      // 1. Check if clicked on a resize/rotation handle of selected elements
      if (selectedElementIds.length > 0) {
        const selectedEls = elements.filter((el) => selectedElementIds.includes(el.id));
        const bounds = getCombinedBounds(selectedEls);
        if (bounds) {
          const hitHandle = getHitHandle(worldPt.x, worldPt.y, bounds, zoom);
          if (hitHandle) {
            setDragState({
              type: hitHandle === 'rotation' ? 'rotating' : 'resizing',
              startX: worldPt.x,
              startY: worldPt.y,
              currentX: worldPt.x,
              currentY: worldPt.y,
              activeHandle: hitHandle,
              initialElementsSnapshot: JSON.parse(JSON.stringify(elements)),
            });
            return;
          }
        }
      }

      // 2. Check if clicked on any element (from top to bottom)
      const hitElement = [...elements].reverse().find((el) => isPointInsideElement(worldPt.x, worldPt.y, el));

      if (hitElement) {
        if (e.shiftKey) {
          setSelectedElementIds((prev) =>
            prev.includes(hitElement.id) ? prev.filter((id) => id !== hitElement.id) : [...prev, hitElement.id]
          );
        } else {
          if (!selectedElementIds.includes(hitElement.id)) {
            setSelectedElementIds([hitElement.id]);
          }
        }

        setDragState({
          type: 'moving',
          startX: worldPt.x,
          startY: worldPt.y,
          currentX: worldPt.x,
          currentY: worldPt.y,
          initialElementsSnapshot: JSON.parse(JSON.stringify(elements)),
        });
        return;
      }

      // 3. Clicked empty space -> start rectangular Marquee Selection
      if (!e.shiftKey) {
        setSelectedElementIds([]);
      }
      setDragState({
        type: 'selecting',
        startX: worldPt.x,
        startY: worldPt.y,
        currentX: worldPt.x,
        currentY: worldPt.y,
        selectionBox: {
          startX: worldPt.x,
          startY: worldPt.y,
          endX: worldPt.x,
          endY: worldPt.y,
        },
      });
      return;
    }

    // Text Tool is now handled in the generic drawing block below to support both click-to-place and click-drag

    // Shape / Freehand Drawing Tools (rectangle, diamond, ellipse, arrow, line, draw, + all new shapes)
    const isLineConnector = (
      activeTool === 'draw' || activeTool === 'line' || activeTool === 'arrow' ||
      activeTool === 'double-arrow' || activeTool === 'curved-arrow' ||
      activeTool === 'elbow-connector' || activeTool === 'dashed-arrow'
    );
    const newId = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newElement: WhiteboardElement = {
      id: newId,
      type: activeTool,
      x: worldPt.x,
      y: worldPt.y,
      width: 0,
      height: 0,
      angle: 0,
      strokeColor: defaultStrokeColor,
      backgroundColor: defaultBackgroundColor,
      fillStyle: defaultFillStyle,
      strokeWidth: defaultStrokeWidth,
      strokeStyle: defaultStrokeStyle,
      roughness: defaultRoughness,
      roundness: false,
      opacity: 100,
      text: '',
      fontSize: activeTool === 'text' ? 22 : 16,
      fontFamily: activeTool === 'text' ? 'Kalam' : 'Inter',
      textAlign: activeTool === 'text' ? 'left' : 'center',
      points: isLineConnector
        ? [{ x: 0, y: 0, pressure: (e as any).pressure || 0.5 }]
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementIds([newId]);

    setDragState({
      type: 'drawing',
      startX: worldPt.x,
      startY: worldPt.y,
      currentX: worldPt.x,
      currentY: worldPt.y,
    });
  };

  // POINTER MOVE
  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Panning
    if (dragState.type === 'panning') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setScrollX((prev) => prev + dx);
      setScrollY((prev) => prev + dy);
      setDragState((prev) => ({
        ...prev,
        startX: e.clientX,
        startY: e.clientY,
      }));
      return;
    }

    const worldPt = getWorldCoords(e);

    // 2. Laser trail — append directly to ref for zero-latency smoothness
    if (activeTool === 'laser' && dragState.type === 'drawing') {
      laserTrailRef.current = [...laserTrailRef.current, { x: worldPt.x, y: worldPt.y, time: Date.now() }];
      return;
    }

    // 3. Eraser drag
    if (dragState.type === 'erasing') {
      const hit = elements.find((el) => isPointInsideElement(worldPt.x, worldPt.y, el));
      if (hit) {
        setElements((prev) => prev.filter((el) => el.id !== hit.id));
        setSelectedElementIds((prev) => prev.filter((id) => id !== hit.id));
      }
      return;
    }

    // 4. Smooth Lasso Selection drag
    if (dragState.type === 'lasso') {
      const nextLasso = [...(dragState.lassoPoints || []), worldPt];
      setDragState((prev) => ({ ...prev, lassoPoints: nextLasso }));

      const matchingIds = elements
        .filter((el) => isElementInsideLasso(el, nextLasso))
        .map((el) => el.id);

      setSelectedElementIds(matchingIds);
      return;
    }

    // 5. Rectangular Marquee Selecting
    if (dragState.type === 'selecting') {
      const box = {
        startX: dragState.startX,
        startY: dragState.startY,
        endX: worldPt.x,
        endY: worldPt.y,
      };
      setDragState((prev) => ({ ...prev, selectionBox: box }));

      const matchingIds = elements
        .filter((el) => isElementIntersectingBox(el, box))
        .map((el) => el.id);

      setSelectedElementIds(matchingIds);
      return;
    }

    // 6. Moving Selected Elements
    if (dragState.type === 'moving' && dragState.initialElementsSnapshot) {
      const dx = worldPt.x - dragState.startX;
      const dy = worldPt.y - dragState.startY;

      const initialMap = new Map(dragState.initialElementsSnapshot.map((el) => [el.id, el]));

      setElements((prev) =>
        prev.map((el) => {
          if (!selectedElementIds.includes(el.id)) return el;
          const orig = initialMap.get(el.id);
          if (!orig || orig.isLocked) return el;
          return {
            ...orig,
            x: orig.x + dx,
            y: orig.y + dy,
            updatedAt: Date.now(),
          };
        })
      );
      return;
    }

    // 7. Resizing Elements
    if (dragState.type === 'resizing' && dragState.activeHandle && dragState.initialElementsSnapshot) {
      const dx = worldPt.x - dragState.startX;
      const dy = worldPt.y - dragState.startY;
      const handle = dragState.activeHandle;

      const initialMap = new Map(dragState.initialElementsSnapshot.map((el) => [el.id, el]));

      setElements((prev) =>
        prev.map((el) => {
          if (!selectedElementIds.includes(el.id)) return el;
          const orig = initialMap.get(el.id);
          if (!orig || orig.isLocked) return el;

          let newX = orig.x;
          let newY = orig.y;
          let newW = orig.width;
          let newH = orig.height;

          if (handle.includes('e')) newW = orig.width + dx;
          if (handle.includes('s')) newH = orig.height + dy;
          if (handle.includes('w')) {
            newX = orig.x + dx;
            newW = orig.width - dx;
          }
          if (handle.includes('n')) {
            newY = orig.y + dy;
            newH = orig.height - dy;
          }

          let newFontSize = orig.fontSize;
          if (orig.type === 'text') {
            // Determine scale factor
            let scale = 1;
            if (handle.length === 2) {
              const scaleX = Math.abs(newW / orig.width);
              const scaleY = Math.abs(newH / orig.height);
              scale = Math.max(scaleX, scaleY); // uniform scale for corners
            } else if (handle === 'e' || handle === 'w') {
              scale = Math.abs(newW / orig.width);
            } else if (handle === 'n' || handle === 's') {
              scale = Math.abs(newH / orig.height);
            }
            
            newFontSize = Math.max(8, (orig.fontSize || 22) * scale);
            
            // Recalculate tight bounds for the new font size
            const dims = measureTextDimensions(orig.text || '', newFontSize, orig.fontFamily || 'Kalam');
            newW = dims.width;
            newH = dims.height;
            
            // Adjust position if dragging from top or left to keep the opposite anchor fixed
            if (handle.includes('w')) newX = orig.x + orig.width - newW;
            if (handle.includes('n')) newY = orig.y + orig.height - newH;
          }

          return {
            ...orig,
            x: newX,
            y: newY,
            width: newW,
            height: newH,
            fontSize: newFontSize,
            updatedAt: Date.now(),
          };
        })
      );
      return;
    }

    // 8. Drawing New Element
    if (dragState.type === 'drawing' && selectedElementIds.length === 1) {
      const currentId = selectedElementIds[0];

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== currentId) return el;

          if (el.type === 'draw') {
            const relX = worldPt.x - el.x;
            const relY = worldPt.y - el.y;
            return {
              ...el,
              points: [...(el.points || []), { x: relX, y: relY, pressure: (e as any).pressure || 0.5 }],
              width: Math.max(el.width, relX),
              height: Math.max(el.height, relY),
              updatedAt: Date.now(),
            };
          }

          if (el.type === 'line' || el.type === 'arrow' || el.type === 'double-arrow' || el.type === 'curved-arrow' || el.type === 'elbow-connector' || el.type === 'dashed-arrow') {
            const endX = worldPt.x - el.x;
            const endY = worldPt.y - el.y;
            return {
              ...el,
              width: endX,
              height: endY,
              points: [
                { x: 0, y: 0 },
                { x: endX, y: endY },
              ],
              updatedAt: Date.now(),
            };
          }

          let width = worldPt.x - el.x;
          let height = worldPt.y - el.y;

          if (e.shiftKey) {
            const side = Math.max(Math.abs(width), Math.abs(height));
            width = width >= 0 ? side : -side;
            height = height >= 0 ? side : -side;
          }

          return {
            ...el,
            width,
            height,
            updatedAt: Date.now(),
          };
        })
      );
    }
  };

  // POINTER UP
  const handlePointerUp = () => {
    if (dragState.type === 'drawing') {
      if (selectedElementIds.length === 1) {
        const id = selectedElementIds[0];

        const connectorTypes = new Set(['line','arrow','double-arrow','curved-arrow','elbow-connector','dashed-arrow']);
        const boxShapes = new Set(['rectangle','rounded-rectangle','ellipse','diamond',
          'triangle','right-triangle','pentagon','hexagon','octagon','star','burst',
          'process','decision','input-output','document','database','terminator',
          'predefined-process','manual-input','delay',
          'cloud','cylinder','folder','server','person','message','speech-bubble','callout']);

        // Use functional update to always read the LATEST elements (avoids stale closure bug)
        setElements((prev) => {
          const el = prev.find((item) => item.id === id);
          if (!el || el.type === 'text' || el.type === 'draw') return prev;

          // Tap-to-place: tiny/zero-size shape → give it a default size
          if (Math.abs(el.width) < 3 && Math.abs(el.height) < 3) {
            return prev.map((item) => {
              if (item.id !== id) return item;
              if (connectorTypes.has(item.type)) {
                return { ...item, width: 120, height: 0, points: [{ x: 0, y: 0 }, { x: 120, y: 0 }] };
              }
              return { ...item, x: item.x - 60, y: item.y - 60, width: 120, height: 120 };
            });
          }

          // Normalize bounding box (flip negative width/height for drag-up or drag-left)
          if (boxShapes.has(el.type)) {
            const minX = Math.min(el.x, el.x + el.width);
            const minY = Math.min(el.y, el.y + el.height);
            const w = Math.abs(el.width);
            const h = Math.abs(el.height);
            return prev.map((item) =>
              item.id === id ? { ...item, x: minX, y: minY, width: w, height: h } : item
            );
          }

          return prev;
        }, true);
      }

      if (activeTool === 'text' && selectedElementIds.length === 1) {
        setEditingTextId(selectedElementIds[0]);
        setEditingTextVal('');
        // Don't switch tool to selection yet, let them finish editing first.
        // Wait, the prompt says "Escape / click outside -> Text becomes normal canvas object"
        // If we switch to selection now, it's fine, the text is still editing because editingTextId is set.
        if (!isToolLocked) setActiveTool('selection');
      } else if (!isToolLocked && activeTool !== 'selection' && activeTool !== 'laser') {
        setActiveTool('selection');
      }
    } else if (
      dragState.type === 'moving' ||
      dragState.type === 'resizing' ||
      dragState.type === 'rotating' ||
      dragState.type === 'erasing'
    ) {
      setElements((prev) => [...prev], true);
    } else if (dragState.type === 'lasso') {
      if (dragState.lassoPoints && dragState.lassoPoints.length > 2) {
        const matchingIds = elements
          .filter((el) => isElementInsideLasso(el, dragState.lassoPoints!))
          .map((el) => el.id);
        setSelectedElementIds(matchingIds);
      }
      if (!isToolLocked && activeTool !== 'selection') {
        setActiveTool('selection');
      }
    }

    setDragState({
      type: 'none',
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  };


  // WHEEL (Zoom & Pan)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(0.1, zoom * zoomFactor), 5.0);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newScrollX = mouseX - (mouseX - scrollX) * (newZoom / zoom);
      const newScrollY = mouseY - (mouseY - scrollY) * (newZoom / zoom);

      setZoom(newZoom);
      setScrollX(newScrollX);
      setScrollY(newScrollY);
    } else {
      setScrollX((prev) => prev - e.deltaX);
      setScrollY((prev) => prev - e.deltaY);
    }
  };

  // DOUBLE CLICK (Inline text edit)
  const handleDoubleClick = (e: React.MouseEvent) => {
    const worldPt = getWorldCoords(e);
    // Find any clicked element (top-most) to edit its text
    const hit = [...elements].reverse().find((el) => isPointInsideElement(worldPt.x, worldPt.y, el));
    
    if (hit && hit.type !== 'draw' && hit.type !== 'image' && hit.type !== 'line') {
      setEditingTextId(hit.id);
      setEditingTextVal(hit.text || '');
      setSelectedElementIds([hit.id]); // ensure it is selected
    } else if (!hit) {
      // Create new auto-sized text object on double click in empty space
      const newId = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newEl: WhiteboardElement = {
        id: newId,
        type: 'text',
        x: worldPt.x,
        y: worldPt.y,
        width: 0,
        height: 0,
        angle: 0,
        strokeColor: defaultStrokeColor,
        backgroundColor: 'transparent',
        fillStyle: 'none',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 0,
        roundness: false,
        opacity: 100,
        text: '',
        fontSize: 22,
        fontFamily: 'Kalam',
        textAlign: 'left',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setElements((prev) => [...prev, newEl]);
      setSelectedElementIds([newId]);
      setEditingTextId(newId);
      setEditingTextVal('');
    }
  };

  // Cursor style based on active state
  const getCursor = () => {
    if (isSpacePressed || activeTool === 'pan' || dragState.type === 'panning') {
      return dragState.type === 'panning' ? 'grabbing' : 'grab';
    }
    if (activeTool === 'eraser') return 'crosshair';
    if (activeTool === 'laser') return 'crosshair';
    if (activeTool === 'lasso') return 'crosshair';
    if (activeTool === 'text') return 'text';
    if (activeTool !== 'selection') return 'crosshair';
    if (dragState.activeHandle) {
      const h = dragState.activeHandle;
      if (h === 'nw' || h === 'se') return 'nwse-resize';
      if (h === 'ne' || h === 'sw') return 'nesw-resize';
      if (h === 'n' || h === 's') return 'ns-resize';
      if (h === 'e' || h === 'w') return 'ew-resize';
      if (h === 'rotation') return 'grab';
    }
    return 'default';
  };

  const editingElement = editingTextId ? elements.find((el) => el.id === editingTextId) : null;
  const editingScreenPt = editingElement
    ? worldToScreen(editingElement.x, editingElement.y, scrollX, scrollY, zoom)
    : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{ cursor: getCursor() }}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Floating Inline Textarea during Text Editing */}
      {editingElement && editingScreenPt && (
        <div
          className="absolute z-40 pointer-events-auto"
          style={{
            left: editingScreenPt.x,
            top: editingScreenPt.y,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${editingElement.width}px`,
            height: `${editingElement.height}px`,
          }}
          data-text-editor
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const isShape = editingElement.type !== 'text';
            const fFamily = isShape ? (editingElement.fontFamily || 'Inter') : (editingElement.fontFamily || 'Kalam');
            const fSize = isShape ? (editingElement.fontSize || 16) : (editingElement.fontSize || 22);
            const lHeightRatio = isShape ? 1.3 : 1.35;
            const lHeight = fSize * lHeightRatio;
            const textLines = editingTextVal.split('\n').length;
            const totalTextH = textLines * lHeight;
            
            // Vertically center text in shapes using padding
            const paddingTop = isShape ? Math.max(0, (Math.abs(editingElement.height) - totalTextH) / 2) : 0;

            return (
              <textarea
                ref={textareaRef}
                autoFocus
                value={editingTextVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingTextVal(val);
                  
                  // Real-time auto-sizing (only for text elements, shapes keep their size)
                  if (!isShape) {
                    const dims = measureTextDimensions(val, fSize, fFamily);
                    setElements((prev) => prev.map((el) => {
                      if (el.id !== editingTextId) return el;
                      return {
                        ...el,
                        text: val,
                        width: Math.max(dims.width, el.width),
                        height: dims.height,
                        updatedAt: Date.now(),
                      };
                    }), false);
                  } else {
                    // Just update text for shapes
                    setElements((prev) => prev.map((el) => {
                      if (el.id !== editingTextId) return el;
                      return { ...el, text: val, updatedAt: Date.now() };
                    }), false);
                  }
                }}
                onBlur={handleCommitText}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCommitText();
                  }
                }}
                style={{
                  fontFamily: `"${fFamily}", ${isShape ? 'sans-serif' : 'cursive, sans-serif'}`,
                  fontSize: `${fSize}px`,
                  color: editingElement.strokeColor,
                  lineHeight: lHeightRatio,
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  resize: 'none',
                  padding: 0,
                  paddingTop: `${paddingTop}px`,
                  margin: 0,
                  overflow: 'hidden',
                  whiteSpace: 'pre',
                  textAlign: isShape ? 'center' : 'left',
                }}
                className="text-slate-900 dark:text-slate-100"
              />
            );
          })()}
        </div>
      )}
    </div>
  );
};
