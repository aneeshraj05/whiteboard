import { useState, useCallback, useRef } from 'react';
import { WhiteboardElement } from '../types/whiteboard';

const MAX_HISTORY = 50;

export function useCanvasHistory(initialElements: WhiteboardElement[] = []) {
  const [elements, setElementsState] = useState<WhiteboardElement[]>(initialElements);
  const historyRef = useRef<WhiteboardElement[][]>([initialElements]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const pushSnapshot = useCallback((newElements: WhiteboardElement[]) => {
    // Truncate future history if we branched
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new snapshot
    nextHistory.push(newElements);
    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.shift();
    }

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setElementsState(newElements);
    updateUndoRedoState();
  }, []);

  const setElements = useCallback((
    action: WhiteboardElement[] | ((prev: WhiteboardElement[]) => WhiteboardElement[]),
    saveHistory: boolean = false
  ) => {
    setElementsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (saveHistory) {
        pushSnapshot(next);
      }
      return next;
    });
  }, [pushSnapshot]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevElements = historyRef.current[historyIndexRef.current];
      setElementsState(prevElements);
      updateUndoRedoState();
      return prevElements;
    }
    return null;
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextElements = historyRef.current[historyIndexRef.current];
      setElementsState(nextElements);
      updateUndoRedoState();
      return nextElements;
    }
    return null;
  }, []);

  const resetHistory = useCallback((initial: WhiteboardElement[]) => {
    historyRef.current = [initial];
    historyIndexRef.current = 0;
    setElementsState(initial);
    updateUndoRedoState();
  }, []);

  return {
    elements,
    setElements,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
