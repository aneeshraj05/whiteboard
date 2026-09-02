import { generateVersion } from '../../utils/version';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ToolType,
  WhiteboardElement,
  FillStyle,
  StrokeStyle,
  RoughnessLevel,
  StrokeWidth,
  BackgroundPattern,
} from '../../types/whiteboard';
import { useCanvasHistory } from '../../hooks/useCanvasHistory';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useCollaboration } from '../../hooks/useCollaboration';
import { exportToJson } from '../../utils/export';
import { measureTextDimensions } from '../../utils/math';
import { TopNav } from '../TopNav';
import { WhiteboardCanvas } from '../WhiteboardCanvas';
import { PropertiesPanel } from '../PropertiesPanel';
import { ZoomControls } from '../ZoomControls';
import { StatusHelp } from '../StatusHelp';
import { MenuDrawer } from '../MenuDrawer';
import { ShortcutsModal } from '../ShortcutsModal';
import { ShareModal } from '../ShareModal';
import { JoinRoomModal } from '../JoinRoomModal';
import { RemoteCursors } from '../RemoteCursors';
import { ChatSidebar } from '../ChatSidebar';
import { useWorkspace } from '../../context/WorkspaceContext';

export function DrawingMode() {
  const { activePage, updatePageDrawingData, sidebarOpen, setSidebarOpen, changePageMode } = useWorkspace();
  const savedState = activePage?.drawingData;

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Collaboration ──────────────────────────────────────────────────────────
  // Detect room from URL hash; show join modal if needed
  const [roomId, setRoomId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  const [joinedUsername, setJoinedUsername] = useState<string | null>(() => {
    // If no room in URL initially, we are in local mode — no username needed
    return roomId ? null : 'local';
  });

  // Show the join modal when room is in URL but user hasn't typed a name yet
  const showJoinModal = roomId !== null && joinedUsername === null;

  const remoteUpdatesRef = useRef<Record<string, number>>({});

  const {
    isConnected,
    myColor,
    myUsername,
    remoteUsers,
    remoteCursors,
    chatMessages,
    broadcastElementUpdate,
    broadcastElementDelete,
    broadcastCanvasClear,
    broadcastCursorMove,
    broadcastChatMessage,
  } = useCollaboration({
    roomId,
    username: joinedUsername === 'local' ? null : joinedUsername,
    onRemoteElementUpdate: useCallback((element: WhiteboardElement) => {
      // Prevent echoing back the remote update
      remoteUpdatesRef.current[element.id] = element.updatedAt;
      
      // Merge remote element into local state without pushing to history
      setElements((prev) => {
        const idx = prev.findIndex((el) => el.id === element.id);
        if (idx === -1) return [...prev, element];
        const next = [...prev];
        next[idx] = element;
        return next;
      });
    }, [setElements]),
    onRemoteElementDelete: useCallback((elementIds: string[]) => {
      setElements((prev) => prev.filter((el) => !elementIds.includes(el.id)));
    }, [setElements]),
    onRemoteCanvasClear: useCallback(() => {
      resetHistory([]);
      setSelectedElementIds([]);
    }, [resetHistory]),
  });

  // Track unread messages when chat is closed
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!isChatOpen && chatMessages.length > prevMsgCountRef.current) {
      setUnreadCount((c) => c + (chatMessages.length - prevMsgCountRef.current));
    }
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages, isChatOpen]);

  const socketIdRef = useRef<string>('');
  useEffect(() => {
    const mine = [...chatMessages].reverse().find((m) => !m.isSystem && m.username === (myUsername || 'You'));
    if (mine) socketIdRef.current = mine.socketId;
  }, [chatMessages, myUsername]);

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

  // Keep a stable ref to the active page id so auto-save doesn't re-run
  // when the activePage object reference changes (e.g., during a mode switch).
  const activePageIdRef = useRef<string | null>(activePage?.id ?? null);
  useEffect(() => {
    activePageIdRef.current = activePage?.id ?? null;
  }, [activePage?.id]);

  // Auto-save state to workspace context
  useEffect(() => {
    const pageId = activePageIdRef.current;
    if (pageId) {
      updatePageDrawingData(pageId, {
        elements,
        selectedElementIds,
        activeTool,
        isToolLocked,
        zoom,
        scrollX,
        scrollY,
        theme,
        canvasBackground,
        backgroundPattern,
        gridEnabled: backgroundPattern !== 'blank',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selectedElementIds, activeTool, isToolLocked, zoom, scrollX, scrollY, theme, canvasBackground, backgroundPattern]);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Insert image file
  const handleInsertImage = useCallback((file: File) => {
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
          updatedAt: generateVersion(),
        };

        setElements((prev) => [...prev, imageElement], true);
        setSelectedElementIds([newId]);
        setActiveTool('selection');
      };
    };
    reader.readAsDataURL(file);
  }, [scrollX, scrollY, zoom, setElements, setSelectedElementIds]);

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

  // Handle activeTool === 'image' file picker
  useEffect(() => {
    if (activeTool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) handleInsertImage(file);
        setActiveTool('selection');
      };
      input.oncancel = () => setActiveTool('selection');
      input.click();
    }
  }, [activeTool, handleInsertImage]);

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
        prev.map((el) => {
          if (!selectedElementIds.includes(el.id)) return el;
          const merged: WhiteboardElement = { ...el, ...props, updatedAt: generateVersion() };
          if (merged.type === 'text' && merged.text) {
            const fSize = merged.fontSize || 22;
            const fFamily = merged.fontFamily || 'Kalam';
            const fWeight = merged.fontWeight || 'normal';
            const fStyle = merged.fontStyle || 'normal';
            const dims = measureTextDimensions(merged.text, fSize, fFamily, fWeight, fStyle);
            merged.width = dims.width;
            merged.height = dims.height;
          }
          return merged;
        }),
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
      updatedAt: generateVersion(),
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
      updatedAt: generateVersion(),
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

          return { ...el, x: newX, y: newY, updatedAt: generateVersion() };
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

  // Group selected elements
  const groupSelected = useCallback(() => {
    if (selectedElementIds.length <= 1) return;
    const newGroupId = `grp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setElements(
      (prev) =>
        prev.map((el) =>
          selectedElementIds.includes(el.id)
            ? { ...el, groupId: newGroupId, updatedAt: generateVersion() }
            : el
        ),
      true
    );
  }, [selectedElementIds, setElements]);

  // Ungroup selected elements
  const ungroupSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    setElements(
      (prev) =>
        prev.map((el) =>
          selectedElementIds.includes(el.id) && el.groupId
            ? { ...el, groupId: undefined, updatedAt: generateVersion() }
            : el
        ),
      true
    );
  }, [selectedElementIds, setElements]);

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
    groupSelected,
    ungroupSelected,
    toggleHelp: () => setIsHelpOpen((prev) => !prev),
    openFile: () => fileInputRef.current?.click(),
    saveFile: () => exportToJson(elements, { canvasBackground }),
    isModalOpen: isMenuOpen || isHelpOpen || isShareOpen,
  });

  // ── Collaboration-aware element broadcast wrappers ────────────────────────
  // Wraps setElements so that after every local mutation we diff and broadcast
  // only the changed / added elements.
  const prevElementsRef = useRef<WhiteboardElement[]>(elements);
  useEffect(() => {
    if (!isConnected) {
      prevElementsRef.current = elements;
      return;
    }
    const prev = prevElementsRef.current;
    prevElementsRef.current = elements;

    // Find added or updated elements
    for (const el of elements) {
      const existing = prev.find((p) => p.id === el.id);
      if (!existing || existing.updatedAt !== el.updatedAt) {
        // Only broadcast if this update wasn't just received from a remote peer
        if (remoteUpdatesRef.current[el.id] !== el.updatedAt) {
          broadcastElementUpdate(el);
        }
      }
    }

    // Find deleted elements
    const deletedIds = prev
      .filter((p) => !elements.find((el) => el.id === p.id))
      .map((p) => p.id);
    if (deletedIds.length > 0) {
      broadcastElementDelete(deletedIds);
    }
  }, [elements, isConnected, broadcastElementUpdate, broadcastElementDelete]);

  return (
    <div className="editor flex flex-col h-full w-full overflow-hidden select-none bg-white dark:bg-[#121212] font-sans">
      {/* Join Room Modal — shown when opening a share link */}
      {showJoinModal && (
        <JoinRoomModal
          roomId={window.location.hash.match(/room=([a-zA-Z0-9_-]+)/)?.[1] ?? ''}
          onJoin={(name) => setJoinedUsername(name)}
        />
      )}

      {/* SOLID TOP BAR — matches NotesMode layout */}
      <TopNav
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        isToolLocked={isToolLocked}
        setIsToolLocked={setIsToolLocked}
        onOpenShare={() => {
          if (!roomId) {
            const newRoomId = Math.random().toString(36).substring(2, 9);
            window.location.hash = `#room=${newRoomId}`;
            setRoomId(newRoomId);
            setJoinedUsername('You');
          }
          setIsShareOpen(true);
        }}
        onImageUploadClick={() => imageUploadInputRef.current?.click()}
        backgroundPattern={backgroundPattern}
        onChangeBackgroundPattern={(pat) => setBackgroundPattern(pat)}
      />

      {/* CANVAS AREA — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden canvas-grid">
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
            onMouseMove={broadcastCursorMove}
          />
        </div>

        {/* Remote cursors overlay */}
        <RemoteCursors
          cursors={remoteCursors}
          zoom={zoom}
          scrollX={scrollX}
          scrollY={scrollY}
        />

        {/* UI Overlay (floating controls within canvas area) */}
        <div className="absolute inset-0 pointer-events-none z-30 select-none">
          {/* Floating Left Properties Inspector Panel */}
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
            onGroup={groupSelected}
            onUngroup={ungroupSelected}
          />

          {/* Bottom Floating Bar: [Zoom] [Undo/Redo] ... [Utilities] */}
          <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-30 px-3 sm:px-4 pointer-events-none flex items-center justify-between">
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

        {/* Chat Sidebar */}
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => { setIsChatOpen(false); }}
          messages={chatMessages}
          mySocketId={socketIdRef.current}
          onSendMessage={broadcastChatMessage}
          isConnected={isConnected}
        />

        {/* Floating chat button (only in a room) */}
        {roomId && (
          <button
            onClick={() => { setIsChatOpen((p) => !p); setUnreadCount(0); }}
            className="absolute bottom-16 right-4 z-40 flex items-center justify-center w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 shadow-lg transition-all text-white pointer-events-auto"
            title="Toggle chat"
          >
            {/* message icon inline */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* MODALS & DRAWERS */}
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
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        isConnected={isConnected}
        roomId={roomId}
        remoteUsers={remoteUsers}
        myColor={myColor}
        myUsername={myUsername || (joinedUsername === 'local' ? 'You' : (joinedUsername ?? 'You'))}
      />
    </div>
  );
}

export default DrawingMode;
