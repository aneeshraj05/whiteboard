import { generateVersion } from '../utils/version';
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
  isConnectorType,
  getShapeAnchorPoints,
  getNearestAnchor,
  syncBoundConnectors,
  scaleElementsInBounds,
  rotateElementsAroundCenter,
  getElementCenter,
  rotatePoint,
  unrotatePoint,
} from '../utils/math';
import {
  renderElement,
  drawSelectionBox,
  drawMarqueeBox,
  drawSmoothLasso,
  drawCanvasPattern,
  drawLaserTrail,
  drawAnchorPoints,
  drawRotationBadge,
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
  onMouseMove?: (x: number, y: number) => void;
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
  onMouseMove,
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
            const dims = measureTextDimensions(val, fontSize, fontFamily);

            return {
              ...el,
              text: val,
              width: el.type === 'text' ? Math.max(dims.width, el.width) : el.width,
              height: el.type === 'text' ? dims.height : el.height,
              updatedAt: generateVersion(),
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

    // Draw Anchor Snap Points when drawing/dragging a connector
    const isConnectorActive = isConnectorType(activeTool) || (dragState.type === 'resizing' && !!dragState.activeEndpoint);
    if (isConnectorActive || dragState.hoveredAnchor) {
      drawAnchorPoints(ctx, elements, dragState.hoveredAnchor, zoom);
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
        const singleEl = selectedEls.length === 1 ? selectedEls[0] : undefined;
        const combinedBounds = singleEl ? getElementBounds(singleEl, false) : getCombinedBounds(selectedEls);
        if (combinedBounds) {
          drawSelectionBox(ctx, combinedBounds, zoom, singleEl);

          // Draw rotation badge HUD if rotating
          if (dragState.type === 'rotating') {
            const rotCenter = singleEl ? getElementCenter(singleEl) : { x: combinedBounds.minX + combinedBounds.width / 2, y: combinedBounds.minY + combinedBounds.height / 2 };
            const currentAngle = singleEl?.angle || 0;
            drawRotationBadge(ctx, rotCenter, currentAngle, zoom);
          }
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
    activeTool,
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
      const filtered = laserTrailRef.current.filter((p) => now - p.time < 2000);
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

    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}

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
        setElements((prev) => syncBoundConnectors(prev.filter((el) => el.id !== hit.id)), true);
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
        const singleEl = selectedEls.length === 1 ? selectedEls[0] : undefined;
        const bounds = singleEl ? getElementBounds(singleEl, false) : getCombinedBounds(selectedEls);
        if (bounds) {
          const center = singleEl ? getElementCenter(singleEl) : { x: bounds.minX + bounds.width / 2, y: bounds.minY + bounds.height / 2 };
          const angle = singleEl?.angle || 0;
          const hitHandle = getHitHandle(worldPt.x, worldPt.y, bounds, zoom, angle, center, singleEl);

          if (hitHandle) {
            if (hitHandle === 'endpoint-start' || hitHandle === 'endpoint-end') {
              setDragState({
                type: 'resizing',
                startX: worldPt.x,
                startY: worldPt.y,
                currentX: worldPt.x,
                currentY: worldPt.y,
                activeHandle: hitHandle,
                activeEndpoint: hitHandle === 'endpoint-start' ? 'start' : 'end',
                initialElementsSnapshot: JSON.parse(JSON.stringify(elements)),
              });
            } else if (hitHandle === 'rotation') {
              setDragState({
                type: 'rotating',
                startX: worldPt.x,
                startY: worldPt.y,
                currentX: worldPt.x,
                currentY: worldPt.y,
                activeHandle: 'rotation',
                initialElementsSnapshot: JSON.parse(JSON.stringify(elements)),
              });
            } else {
              setDragState({
                type: 'resizing',
                startX: worldPt.x,
                startY: worldPt.y,
                currentX: worldPt.x,
                currentY: worldPt.y,
                activeHandle: hitHandle,
                initialElementsSnapshot: JSON.parse(JSON.stringify(elements)),
              });
            }
            return;
          }
        }
      }

      // 2. Check if clicked on any element (from top to bottom)
      const hitElement = [...elements].reverse().find((el) => isPointInsideElement(worldPt.x, worldPt.y, el));

      if (hitElement) {
        // Handle Group selection: if element belongs to a group, select all group members
        let targetIds = [hitElement.id];
        if (hitElement.groupId) {
          targetIds = elements.filter((el) => el.groupId === hitElement.groupId).map((el) => el.id);
        }

        if (e.shiftKey) {
          const allSelected = targetIds.every((id) => selectedElementIds.includes(id));
          setSelectedElementIds((prev) =>
            allSelected ? prev.filter((id) => !targetIds.includes(id)) : Array.from(new Set([...prev, ...targetIds]))
          );
        } else {
          const isAlreadySelected = targetIds.every((id) => selectedElementIds.includes(id));
          if (!isAlreadySelected) {
            setSelectedElementIds(targetIds);
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

    // Shape / Freehand Drawing / Connector Tools
    const isLineConnector = isConnectorType(activeTool);
    const newId = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // If starting a connector, check for magnetic anchor snap on a shape
    let initialX = worldPt.x;
    let initialY = worldPt.y;
    let startBinding: { elementId: string; anchor: any } | undefined = undefined;

    if (isLineConnector) {
      const nearestAnchor = getNearestAnchor(worldPt, elements);
      if (nearestAnchor) {
        initialX = nearestAnchor.point.x;
        initialY = nearestAnchor.point.y;
        startBinding = { elementId: nearestAnchor.elementId, anchor: nearestAnchor.anchor };
      }
    }


    const newElement: WhiteboardElement = {
      id: newId,
      type: activeTool,
      x: initialX,
      y: initialY,
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
      startBinding,
      points: isLineConnector || activeTool === 'draw'
        ? [{ x: 0, y: 0, pressure: (e as any).pressure || 0.5 }]
        : undefined,
      createdAt: Date.now(),
      updatedAt: generateVersion(),
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementIds([newId]);

    setDragState({
      type: 'drawing',
      startX: initialX,
      startY: initialY,
      currentX: initialX,
      currentY: initialY,
      hoveredAnchor: isLineConnector && startBinding ? { ...startBinding, point: { x: initialX, y: initialY } } : undefined,
    });
  };

  // POINTER MOVE
  const handlePointerMove = (e: React.PointerEvent) => {
    const worldPt = getWorldCoords(e);
    if (onMouseMove) {
      onMouseMove(worldPt.x, worldPt.y);
    }

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

    // 2. Laser trail
    if (activeTool === 'laser' && dragState.type === 'drawing') {
      laserTrailRef.current = [...laserTrailRef.current, { x: worldPt.x, y: worldPt.y, time: Date.now() }];
      return;
    }

    // 3. Eraser drag
    if (dragState.type === 'erasing') {
      const hit = elements.find((el) => isPointInsideElement(worldPt.x, worldPt.y, el));
      if (hit) {
        setElements((prev) => syncBoundConnectors(prev.filter((el) => el.id !== hit.id)));
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

      setElements((prev) => {
        const moved = prev.map((el) => {
          if (!selectedElementIds.includes(el.id)) return el;
          const orig = initialMap.get(el.id);
          if (!orig || orig.isLocked) return el;
          return {
            ...orig,
            x: orig.x + dx,
            y: orig.y + dy,
            updatedAt: generateVersion(),
          };
        });
        // Dynamically sync attached connectors as shapes move
        return syncBoundConnectors(moved);
      });
      return;
    }

    // 7. Rotating Elements
    if (dragState.type === 'rotating' && dragState.initialElementsSnapshot) {
      const selectedSnapshot = dragState.initialElementsSnapshot.filter((el) => selectedElementIds.includes(el.id));
      if (selectedSnapshot.length === 0) return;

      const singleEl = selectedSnapshot.length === 1 ? selectedSnapshot[0] : undefined;
      const center = singleEl
        ? getElementCenter(singleEl)
        : (() => {
            const b = getCombinedBounds(selectedSnapshot);
            return b ? { x: b.minX + b.width / 2, y: b.minY + b.height / 2 } : { x: dragState.startX, y: dragState.startY };
          })();

      // Raw pointer angle relative to center
      let rawAngle = Math.atan2(worldPt.y - center.y, worldPt.x - center.x) + Math.PI / 2;

      // Snap to 15-degree increments (PI / 12) if Shift is pressed or within 3 degrees
      const snapStep = Math.PI / 12; // 15 degrees
      if (e.shiftKey) {
        rawAngle = Math.round(rawAngle / snapStep) * snapStep;
      } else {
        // Auto-snap near standard 0, 90, 180, 270 angles
        const nearestSnap = Math.round(rawAngle / snapStep) * snapStep;
        if (Math.abs(rawAngle - nearestSnap) < Math.PI / 60) {
          rawAngle = nearestSnap;
        }
      }

      if (singleEl) {
        setElements((prev) => {
          const rotated = prev.map((el) => {
            if (el.id !== singleEl.id) return el;
            return {
              ...el,
              angle: rawAngle,
              updatedAt: generateVersion(),
            };
          });
          return syncBoundConnectors(rotated);
        });
      } else {
        // Multi-selection / group rotation around group collective center
        const startAngle = Math.atan2(dragState.startY - center.y, dragState.startX - center.x) + Math.PI / 2;
        let deltaAngle = rawAngle - startAngle;
        if (e.shiftKey) {
          deltaAngle = Math.round(deltaAngle / snapStep) * snapStep;
        }

        const rotatedMap = new Map(
          rotateElementsAroundCenter(selectedSnapshot, center, deltaAngle).map((el) => [el.id, el])
        );

        setElements((prev) => {
          const next = prev.map((el) => rotatedMap.get(el.id) || el);
          return syncBoundConnectors(next);
        });
      }
      return;
    }

    // 8. Resizing Elements
    if (dragState.type === 'resizing' && dragState.activeHandle && dragState.initialElementsSnapshot) {
      const handle = dragState.activeHandle;
      const initialMap = new Map(dragState.initialElementsSnapshot.map((el) => [el.id, el]));
      const selectedSnapshot = dragState.initialElementsSnapshot.filter((el) => selectedElementIds.includes(el.id));

      // 8a. Reconnecting / dragging endpoint of a connector
      if (dragState.activeEndpoint && selectedSnapshot.length === 1 && isConnectorType(selectedSnapshot[0].type)) {
        const origConnector = selectedSnapshot[0];
        const isStart = dragState.activeEndpoint === 'start';

        // Check for magnetic anchor snap
        const excludeShapeId = isStart ? origConnector.endBinding?.elementId : origConnector.startBinding?.elementId;
        const nearestAnchor = getNearestAnchor(worldPt, elements, excludeShapeId);

        const targetPt = nearestAnchor ? nearestAnchor.point : worldPt;
        setDragState((prev) => ({ ...prev, hoveredAnchor: nearestAnchor || undefined }));

        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== origConnector.id) return el;

            let startX = isStart ? targetPt.x : origConnector.x;
            let startY = isStart ? targetPt.y : origConnector.y;
            let endX = isStart ? origConnector.x + origConnector.width : targetPt.x;
            let endY = isStart ? origConnector.y + origConnector.height : targetPt.y;

            const newW = endX - startX;
            const newH = endY - startY;

            return {
              ...el,
              x: startX,
              y: startY,
              width: newW,
              height: newH,
              points: [
                { x: 0, y: 0 },
                { x: newW, y: newH },
              ],
              startBinding: isStart
                ? nearestAnchor
                  ? { elementId: nearestAnchor.elementId, anchor: nearestAnchor.anchor }
                  : undefined
                : el.startBinding,
              endBinding: !isStart
                ? nearestAnchor
                  ? { elementId: nearestAnchor.elementId, anchor: nearestAnchor.anchor }
                  : undefined
                : el.endBinding,
              updatedAt: generateVersion(),
            };
          })
        );
        return;
      }

      // 8b. Single Element Resizing
      if (selectedSnapshot.length === 1) {
        const orig = selectedSnapshot[0];
        if (orig.isLocked) return;

        let dx = worldPt.x - dragState.startX;
        let dy = worldPt.y - dragState.startY;

        // If element is rotated, project delta into element's local coordinate frame
        if (orig.angle && !isConnectorType(orig.type)) {
          const cos = Math.cos(-orig.angle);
          const sin = Math.sin(-orig.angle);
          const localDx = dx * cos - dy * sin;
          const localDy = dx * sin + dy * cos;
          dx = localDx;
          dy = localDy;
        }

        let newW = orig.width;
        let newH = orig.height;
        let newX = orig.x;
        let newY = orig.y;

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

        // Shift: preserve aspect ratio for corner handles
        if (e.shiftKey && handle.length === 2 && orig.width !== 0 && orig.height !== 0) {
          const origRatio = Math.abs(orig.width / orig.height);
          const currentRatio = Math.abs(newW / (newH || 1));
          if (currentRatio > origRatio) {
            const adjustedW = Math.abs(newH) * origRatio * Math.sign(newW || 1);
            if (handle.includes('w')) newX += newW - adjustedW;
            newW = adjustedW;
          } else {
            const adjustedH = Math.abs(newW) / origRatio * Math.sign(newH || 1);
            if (handle.includes('n')) newY += newH - adjustedH;
            newH = adjustedH;
          }
        }

        let newFontSize = orig.fontSize;
        if (orig.type === 'text') {
          const scale = Math.max(Math.abs(newW / (orig.width || 1)), Math.abs(newH / (orig.height || 1)));
          newFontSize = Math.max(8, (orig.fontSize || 22) * scale);
          const dims = measureTextDimensions(orig.text || '', newFontSize, orig.fontFamily || 'Kalam');
          newW = dims.width;
          newH = dims.height;
          if (handle.includes('w')) newX = orig.x + orig.width - newW;
          if (handle.includes('n')) newY = orig.y + orig.height - newH;
        }

        // Scale points for draw elements
        let scaledPoints = orig.points;
        if (orig.type === 'draw' && orig.points && orig.points.length > 0 && orig.width !== 0 && orig.height !== 0) {
          const sx = newW / orig.width;
          const sy = newH / orig.height;
          scaledPoints = orig.points.map((p) => ({
            x: p.x * sx,
            y: p.y * sy,
            pressure: p.pressure,
          }));
        }

        setElements((prev) => {
          const next = prev.map((el) => {
            if (el.id !== orig.id) return el;
            return {
              ...orig,
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              points: scaledPoints,
              fontSize: newFontSize,
              updatedAt: generateVersion(),
            };
          });
          return syncBoundConnectors(next);
        });
        return;
      }

      // 8c. Multi-Element / Group Proportional Resizing
      if (selectedSnapshot.length > 1) {
        const initBounds = getCombinedBounds(selectedSnapshot);
        if (!initBounds) return;

        const dx = worldPt.x - dragState.startX;
        const dy = worldPt.y - dragState.startY;

        let nextMinX = initBounds.minX;
        let nextMinY = initBounds.minY;
        let nextMaxX = initBounds.maxX;
        let nextMaxY = initBounds.maxY;

        if (handle.includes('e')) nextMaxX = initBounds.maxX + dx;
        if (handle.includes('s')) nextMaxY = initBounds.maxY + dy;
        if (handle.includes('w')) nextMinX = initBounds.minX + dx;
        if (handle.includes('n')) nextMinY = initBounds.minY + dy;

        const newBounds = {
          minX: Math.min(nextMinX, nextMaxX - 10),
          minY: Math.min(nextMinY, nextMaxY - 10),
          maxX: Math.max(nextMaxX, nextMinX + 10),
          maxY: Math.max(nextMaxY, nextMinY + 10),
          width: Math.max(nextMaxX - nextMinX, 10),
          height: Math.max(nextMaxY - nextMinY, 10),
        };

        const scaledMap = new Map(
          scaleElementsInBounds(selectedSnapshot, initBounds, newBounds).map((el) => [el.id, el])
        );

        setElements((prev) => {
          const next = prev.map((el) => scaledMap.get(el.id) || el);
          return syncBoundConnectors(next);
        });
        return;
      }
    }

    // 9. Drawing New Element
    if (dragState.type === 'drawing' && selectedElementIds.length === 1) {
      const currentId = selectedElementIds[0];

      // If drawing a connector, test for magnetic anchor snap on target shape
      let endX = worldPt.x;
      let endY = worldPt.y;
      let hoveredTarget: any = undefined;

      if (isConnectorType(activeTool)) {
        const currentEl = elements.find((el) => el.id === currentId);
        const nearestAnchor = getNearestAnchor(worldPt, elements, currentEl?.startBinding?.elementId);
        if (nearestAnchor) {
          endX = nearestAnchor.point.x;
          endY = nearestAnchor.point.y;
          hoveredTarget = nearestAnchor;
        }
        setDragState((prev) => ({ ...prev, hoveredAnchor: hoveredTarget }));
      }

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
              updatedAt: generateVersion(),
            };
          }

          if (isConnectorType(el.type)) {
            const w = endX - el.x;
            const h = endY - el.y;
            return {
              ...el,
              width: w,
              height: h,
              endBinding: hoveredTarget
                ? { elementId: hoveredTarget.elementId, anchor: hoveredTarget.anchor }
                : undefined,
              points: [
                { x: 0, y: 0 },
                { x: w, y: h },
              ],
              updatedAt: generateVersion(),
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
            updatedAt: generateVersion(),
          };
        })
      );
    }
  };

  // POINTER UP
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}

    if (dragState.type === 'drawing') {
      if (selectedElementIds.length === 1) {
        const id = selectedElementIds[0];

        const connectorTypes = new Set(['line','arrow','double-arrow','curved-arrow','elbow-connector','dashed-arrow']);
        const boxShapes = new Set(['rectangle','rounded-rectangle','ellipse','diamond',
          'triangle','right-triangle','pentagon','hexagon','octagon','star','burst',
          'process','decision','input-output','document','database','terminator',
          'predefined-process','manual-input','delay',
          'cloud','cylinder','folder','server','person','message','speech-bubble','callout']);

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

          return syncBoundConnectors(prev);
        }, true);
      }

      if (activeTool === 'text' && selectedElementIds.length === 1) {
        setEditingTextId(selectedElementIds[0]);
        setEditingTextVal('');
        if (!isToolLocked) setActiveTool('selection');
      } else if (!isToolLocked && activeTool !== 'selection' && activeTool !== 'laser' && activeTool !== 'draw') {
        setActiveTool('selection');
      }
    } else if (
      dragState.type === 'moving' ||
      dragState.type === 'resizing' ||
      dragState.type === 'rotating' ||
      dragState.type === 'erasing'
    ) {
      setElements((prev) => syncBoundConnectors([...prev]), true);
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
      hoveredAnchor: undefined,
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

    if (hit && hit.type !== 'draw' && hit.type !== 'image' && !isConnectorType(hit.type)) {
      setEditingTextId(hit.id);
      setEditingTextVal(hit.text || '');
      setSelectedElementIds([hit.id]);
    } else if (!hit) {
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
        updatedAt: generateVersion(),
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
      if (h === 'endpoint-start' || h === 'endpoint-end') return 'crosshair';
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
            transform: `scale(${zoom}) rotate(${((editingElement.angle || 0) * 180) / Math.PI}deg)`,
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
            const paddingTop = isShape ? Math.max(0, (Math.abs(editingElement.height) - totalTextH) / 2) : 0;

            return (
              <textarea
                ref={textareaRef}
                autoFocus
                value={editingTextVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingTextVal(val);

                  if (!isShape) {
                    const dims = measureTextDimensions(val, fSize, fFamily);
                    setElements((prev) => prev.map((el) => {
                      if (el.id !== editingTextId) return el;
                      return {
                        ...el,
                        text: val,
                        width: Math.max(dims.width, el.width),
                        height: dims.height,
                        updatedAt: generateVersion(),
                      };
                    }), false);
                  } else {
                    setElements((prev) => prev.map((el) => {
                      if (el.id !== editingTextId) return el;
                      return { ...el, text: val, updatedAt: generateVersion() };
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

export default WhiteboardCanvas;

