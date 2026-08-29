import { CanvasState, WhiteboardElement, BackgroundPattern } from '../types/whiteboard';

const STORAGE_KEY = 'whiteboard_app_state_v1';

export function loadSavedCanvasState(): Partial<CanvasState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Failed to load canvas state from localStorage', err);
    return null;
  }
}

export function saveCanvasState(state: {
  elements: WhiteboardElement[];
  zoom: number;
  scrollX: number;
  scrollY: number;
  theme: 'light' | 'dark';
  canvasBackground: string;
  backgroundPattern?: BackgroundPattern;
  gridEnabled: boolean;
}): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save canvas state to localStorage', err);
  }
}

export function clearSavedCanvas(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear canvas state from localStorage', err);
  }
}
