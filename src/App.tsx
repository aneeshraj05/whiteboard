import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ToolType,
  WhiteboardElement,
  FillStyle,
  StrokeStyle,
  RoughnessLevel,
  StrokeWidth,
  BackgroundPattern,
} from './types/whiteboard';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadSavedCanvasState, saveCanvasState, clearSavedCanvas } from './utils/storage';
import { exportToJson } from './utils/export';
import { TopNav } from './components/TopNav';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ZoomControls } from './components/ZoomControls';
import { StatusHelp } from './components/StatusHelp';
import { MenuDrawer } from './components/MenuDrawer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ShareModal } from './components/ShareModal';

export function App() {
  const savedState = loadSavedCanvasState();

  const {
    elements,
    setElements,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useCanvasHistory(savedState?.elements || []);

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('selection');
  const [isToolLocked, setIsToolLocked] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(savedState?.zoom || 1);
  const [scrollX, setScrollX] = useState<number>(savedState?.scrollX || 0);
  const [scrollY, setScrollY] = useState<number>(savedState?.scrollY || 0);
  const [theme, setTheme] = useState<'light' | 'dark'>(savedState?.theme || 'light');
  const [canvasBackground, setCanvasBackground] = useState<string>(
    savedState?.canvasBackground || (savedState?.theme === 'dark' ? '#121212' : '#ffffff')
  );
  const [backgroundPattern, setBackgroundPattern] = useState<BackgroundPattern>(
    savedState?.backgroundPattern || 'dotted'
  );

  // Default drawing styles
  const [defaultStrokeColor, setDefaultStrokeColor] = useState<string>('#1e1e1e');
  const [defaultBackgroundColor, setDefaultBackgroundColor] = useState<string>('transparent');
  const [defaultFillStyle, setDefaultFillStyle] = useState<FillStyle>('hachure');
  const [defaultStrokeWidth, setDefaultStrokeWidth] = useState<StrokeWidth>(2);
  const [defaultStrokeStyle, setDefaultStrokeStyle] = useState<StrokeStyle>('solid');
  const [defaultRoughness, setDefaultRoughness] = useState<RoughnessLevel>(1);

  // Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent browser-level page scaling
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const handleGlobalGesture = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    window.addEventListener('gesturestart', handleGlobalGesture);
    window.addEventListener('gesturechange', handleGlobalGesture);
    window.addEventListener('gestureend', handleGlobalGesture);

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('gesturestart', handleGlobalGesture);
      window.removeEventListener('gesturechange', handleGlobalGesture);
      window.removeEventListener('gestureend', handleGlobalGesture);
    };
  }, []);

  // Auto-save state
  useEffect(() => {
    saveCanvasState({
      elements,
      zoom,
      scrollX,
      scrollY,
      theme,
      canvasBackground,
      backgroundPattern,
      gridEnabled: backgroundPattern !== 'blank',
    });
  }, [elements, zoom, scrollX, scrollY, theme, canvasBackground, backgroundPattern]);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Insert image file
  const handleInsertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const maxWidth = 400;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = img.width * scale;
        const height = img.height * scale;

        const centerX = (window.innerWidth / 2 - scrollX) / zoom - width / 2;
        const centerY = (window.innerHeight / 2 - scrollY) / zoom - height / 2;

        const newId = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const imageElement: WhiteboardElement = {
          id: newId,
          type: 'image',
          x: centerX,
          y: centerY,
          width,
          height,
          angle: 0,
          strokeColor: '#1e1e1e',
          backgroundColor: 'transparent',
          fillStyle: 'none',
          strokeWidth: 2,
          strokeStyle: 'solid',
          roughness: 0,
          roundness: false,
          opacity: 100,
          imageDataUrl: dataUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setElements((prev) => [...prev, imageElement], true);
        setSelectedElementIds([newId]);
        setActiveTool('selection');
      };
    };
    reader.readAsDataURL(file);
  };

  // Paste & drop image listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) handleInsertImage(file);
          break;
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files && files[0] && files[0].type.startsWith('image/')) {
        handleInsertImage(files[0]);
      }
    };

    const handleDragOver = (e: DragEvent) => e.preventDefault();

    window.addEventListener('paste', handlePaste);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [scrollX, scrollY, zoom]);

  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));

  // Update properties of selected elements
  const updateElementProps = useCallback((props: Partial<WhiteboardElement>) => {
    if (props.strokeColor) setDefaultStrokeColor(props.strokeColor);
    if (props.backgroundColor) setDefaultBackgroundColor(props.backgroundColor);
    if (props.fillStyle) setDefaultFillStyle(props.fillStyle);
    if (props.strokeWidth) setDefaultStrokeWidth(props.strokeWidth);
    if (props.strokeStyle) setDefaultStrokeStyle(props.strokeStyle);
    if (props.roughness !== undefined) setDefaultRoughness(props.roughness);

    setElements(
      (prev) =>
        prev.map((el) => (selectedElementIds.includes(el.id) ? { ...el, ...props, updatedAt: Date.now() } : el)),
      true
    );
  }, [selectedElementIds, setElements]);

  // Duplicate selected
  const duplicateSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const toDuplicate = elements.filter((el) => selectedElementIds.includes(el.id));
    const newElements: WhiteboardElement[] = toDuplicate.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: el.x + 20,
      y: el.y + 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    setElements((prev) => [...prev, ...newElements], true);
    setSelectedElementIds(newElements.map((el) => el.id));
  }, [elements, selectedElementIds, setElements]);

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    setElements((prev) => prev.filter((el) => !selectedElementIds.includes(el.id)), true);
    setSelectedElementIds([]);
  }, [selectedElementIds, setElements]);

  // Select all
  const selectAll = useCallback(() => {
    setSelectedElementIds(elements.map((el) => el.id));
  }, [elements]);

  // Clipboard operations
  const clipboardRef = useRef<WhiteboardElement[]>([]);
  const copySelected = useCallback(() => {
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    clipboardRef.current = JSON.parse(JSON.stringify(selected));
  }, [elements, selectedElementIds]);

  const pasteSelected = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    const pasted: WhiteboardElement[] = clipboardRef.current.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: el.x + 24,
      y: el.y + 24,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    clipboardRef.current = pasted;
    setElements((prev) => [...prev, ...pasted], true);
    setSelectedElementIds(pasted.map((el) => el.id));
  }, [setElements]);

  // Layer ordering
  const bringToFront = () => {
    setElements((prev) => {
      const remaining = prev.filter((el) => !selectedElementIds.includes(el.id));
      const target = prev.filter((el) => selectedElementIds.includes(el.id));
      return [...remaining, ...target];
    }, true);
  };

  const bringForward = () => {
    setElements((prev) => {
      const next = [...prev];
      for (let i = next.length - 2; i >= 0; i--) {
        if (selectedElementIds.includes(next[i].id) && !selectedElementIds.includes(next[i + 1].id)) {
          const tmp = next[i];
          next[i] = next[i + 1];
          next[i + 1] = tmp;
        }
      }
      return next;
    }, true);
  };

  const sendBackward = () => {
    setElements((prev) => {
      const next = [...prev];
      for (let i = 1; i < next.length; i++) {
        if (selectedElementIds.includes(next[i].id) && !selectedElementIds.includes(next[i - 1].id)) {
          const tmp = next[i];
          next[i] = next[i - 1];
          next[i - 1] = tmp;
        }
      }
      return next;
    }, true);
  };

  const sendToBack = () => {
    setElements((prev) => {
      const remaining = prev.filter((el) => !selectedElementIds.includes(el.id));
      const target = prev.filter((el) => selectedElementIds.includes(el.id));
      return [...target, ...remaining];
    }, true);
  };

  // Alignment
  const alignElements = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedElementIds.length <= 1) return;
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selected.length === 0) return;

    let minX = Math.min(...selected.map((el) => el.x));
    let maxX = Math.max(...selected.map((el) => el.x + el.width));
    let minY = Math.min(...selected.map((el) => el.y));
    let maxY = Math.max(...selected.map((el) => el.y + el.height));
    let midX = (minX + maxX) / 2;
    let midY = (minY + maxY) / 2;

    setElements(
      (prev) =>
        prev.map((el) => {
          if (!selectedElementIds.includes(el.id)) return el;
          let newX = el.x;
          let newY = el.y;

          if (type === 'left') newX = minX;
          if (type === 'center') newX = midX - el.width / 2;
          if (type === 'right') newX = maxX - el.width;
          if (type === 'top') newY = minY;
          if (type === 'middle') newY = midY - el.height / 2;
          if (type === 'bottom') newY = maxY - el.height;

          return { ...el, x: newX, y: newY, updatedAt: Date.now() };
        }),
      true
    );
  };

  // Zoom helpers
  const zoomIn = useCallback(() => setZoom((prev) => Math.min(prev * 1.2, 5.0)), []);
  const zoomOut = useCallback(() => setZoom((prev) => Math.max(prev * 0.8, 0.1)), []);
  const resetZoom = useCallback(() => {
    setZoom(1);
    setScrollX(0);
    setScrollY(0);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setCanvasBackground(nextTheme === 'dark' ? '#121212' : '#ffffff');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    activeTool,
    setActiveTool,
    undo,
    redo,
    deleteSelected,
    selectAll,
    duplicateSelected,
    copySelected,
    pasteSelected,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleHelp: () => setIsHelpOpen((prev) => !prev),
    openFile: () => fileInputRef.current?.click(),
    saveFile: () => exportToJson(elements, { canvasBackground }),
    isModalOpen: isMenuOpen || isHelpOpen || isShareOpen,
  });

  return (
    <div className="editor fixed inset-0 w-screen h-screen overflow-hidden select-none bg-white dark:bg-[#121212] font-sans">
      {/* LAYER 1: CANVAS LAYER (Completely empty canvas by default, drawing & background objects) */}
      <div className="canvas-layer absolute inset-0 z-0 overflow-hidden">
        <WhiteboardCanvas
          elements={elements}
          setElements={setElements}
          selectedElementIds={selectedElementIds}
          setSelectedElementIds={setSelectedElementIds}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isToolLocked={isToolLocked}
          zoom={zoom}
          setZoom={setZoom}
          scrollX={scrollX}
          setScrollX={setScrollX}
          scrollY={scrollY}
          setScrollY={setScrollY}
          theme={theme}
          canvasBackground={canvasBackground}
          backgroundPattern={backgroundPattern}
          defaultStrokeColor={defaultStrokeColor}
          defaultBackgroundColor={defaultBackgroundColor}
          defaultFillStyle={defaultFillStyle}
          defaultStrokeWidth={defaultStrokeWidth}
          defaultStrokeStyle={defaultStrokeStyle}
          defaultRoughness={defaultRoughness}
        />
      </div>

      {/* LAYER 2: DEDICATED FIXED UI OVERLAY (Clean, minimal controls fixed to viewport) */}
      <div className="ui-layer fixed inset-0 pointer-events-none z-30 select-none">
        {/* Top Floating Centered Navbar: [Menu] [Centered Toolbar] [Essential Actions] */}
        <TopNav
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isToolLocked={isToolLocked}
          setIsToolLocked={setIsToolLocked}
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onImageUploadClick={() => imageUploadInputRef.current?.click()}
          backgroundPattern={backgroundPattern}
          onChangeBackgroundPattern={(pat) => setBackgroundPattern(pat)}
        />

        {/* Floating Left Properties Inspector Panel (Active only when elements are selected) */}
        <PropertiesPanel
          selectedElements={selectedElements}
          onUpdateElementProps={updateElementProps}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onBringToFront={bringToFront}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onSendToBack={sendToBack}
          onAlign={alignElements}
        />

        {/* Bottom Floating Bar: [Zoom] [Undo/Redo] ... [Utilities] */}
        <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-30 px-3 sm:px-4 pointer-events-none flex items-center justify-between">
          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={resetZoom}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />

          <StatusHelp onOpenHelp={() => setIsHelpOpen(true)} />
        </div>
      </div>

      {/* LAYER 3: MODALS & DRAWERS (z-50) */}
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const text = evt.target?.result as string;
              const parsed = JSON.parse(text);
              const loaded = parsed.elements || parsed;
              if (Array.isArray(loaded)) {
                resetHistory(loaded);
                setSelectedElementIds([]);
              }
            } catch {
              alert('Failed to load JSON file');
            }
          };
          reader.readAsText(file);
        }}
        accept=".json,.whiteboard"
        className="hidden"
      />

      <input
        type="file"
        ref={imageUploadInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleInsertImage(file);
        }}
        accept="image/*"
        className="hidden"
      />

      {/* Slide-out Menu Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        elements={elements}
        onLoadElements={(loaded) => {
          resetHistory(loaded);
          setSelectedElementIds([]);
        }}
        onClearCanvas={() => {
          clearSavedCanvas();
          resetHistory([]);
          setSelectedElementIds([]);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        canvasBackground={canvasBackground}
        onChangeCanvasBackground={(bg) => setCanvasBackground(bg)}
        gridEnabled={backgroundPattern !== 'blank'}
        onToggleGrid={() =>
          setBackgroundPattern((prev) => (prev === 'blank' ? 'dotted' : 'blank'))
        }
        onOpenHelp={() => setIsHelpOpen(true)}
        onResetZoom={resetZoom}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Collaboration / Share Modal */}
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
}

export default App;
