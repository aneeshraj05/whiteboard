import { useEffect } from 'react';
import { ToolType } from '../types/whiteboard';

interface ShortcutHandlers {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  selectAll: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteSelected: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleHelp: () => void;
  openFile: () => void;
  saveFile: () => void;
  groupSelected?: () => void;
  ungroupSelected?: () => void;
  isModalOpen?: boolean;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs or contentEditable or if a modal is focused
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          if (e.shiftKey) {
            handlers.ungroupSelected?.();
          } else {
            handlers.groupSelected?.();
          }
          return;
        }

        if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          handlers.ungroupSelected?.();
          return;
        }

        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handlers.redo();
          } else {
            handlers.undo();
          }
          return;
        }

        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handlers.redo();
          return;
        }

        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handlers.selectAll();
          return;
        }

        if (e.key.toLowerCase() === 'c') {
          handlers.copySelected();
          return;
        }

        if (e.key.toLowerCase() === 'v') {
          handlers.pasteSelected();
          return;
        }

        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handlers.duplicateSelected();
          return;
        }

        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          handlers.saveFile();
          return;
        }

        if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          handlers.openFile();
          return;
        }

        if (e.key === '0' || e.key === ')') {
          e.preventDefault();
          handlers.resetZoom();
          return;
        }

        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handlers.zoomIn();
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handlers.zoomOut();
          return;
        }
      }

      // Single key shortcuts
      if (!isCtrlOrMeta && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case '1':
          case 'v':
            handlers.setActiveTool('selection');
            break;
          case 'h':
            handlers.setActiveTool('pan');
            break;
          case '2':
          case 'r':
            handlers.setActiveTool('rectangle');
            break;
          case '3':
          case 'd':
            handlers.setActiveTool('diamond');
            break;
          case '4':
          case 'o':
            handlers.setActiveTool('ellipse');
            break;
          case '5':
          case 'a':
            handlers.setActiveTool('arrow');
            break;
          case '6':
          case 'l':
            handlers.setActiveTool('line');
            break;
          case '7':
          case 'p':
            handlers.setActiveTool('draw');
            break;
          case '8':
          case 't':
            handlers.setActiveTool('text');
            break;
          case '9':
            handlers.setActiveTool('image');
            break;
          case '0':
          case 'e':
            handlers.setActiveTool('eraser');
            break;
          case '?':
          case '/':
            e.preventDefault();
            handlers.toggleHelp();
            break;
          case 'delete':
          case 'backspace':
            handlers.deleteSelected();
            break;
          case '+':
          case '=':
            handlers.zoomIn();
            break;
          case '-':
            handlers.zoomOut();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
