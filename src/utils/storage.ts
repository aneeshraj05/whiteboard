import { CanvasState, WhiteboardElement, BackgroundPattern } from '../types/whiteboard';
import { WorkspaceState, Page } from '../types/workspace';

const OLD_STORAGE_KEY = 'whiteboard_app_state_v1';
const WORKSPACE_STORAGE_KEY = 'whiteboard_workspace_v1';

export function loadSavedCanvasState(): Partial<CanvasState> | null {
  try {
    const raw = localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load old canvas state', err);
    return null;
  }
}

export function loadWorkspaceState(): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceState;

    // Migration: add icon and favorite defaults to pages that don't have them
    const migrated: WorkspaceState = {
      ...parsed,
      pages: parsed.pages.map((p: any) => ({
        ...p,
        icon: (p.icon && /^[A-Za-z]+$/.test(p.icon)) ? p.icon : (p.mode === 'drawing' ? 'PenTool' : 'FileText'),
        favorite: p.favorite ?? false,
        noteData: p.noteData
          ? { content: (p.noteData as any).content ?? '' }
          : { content: '' },
      })),
    };

    return migrated;
  } catch (err) {
    console.error('Failed to load workspace state', err);
    return null;
  }
}

export function saveWorkspaceState(state: WorkspaceState): void {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save workspace state', err);
  }
}

export function migrateToWorkspaceIfNeeded(): WorkspaceState {
  const wsState = loadWorkspaceState();
  if (wsState) {
    return wsState;
  }

  // Create default empty workspace
  const newWorkspace: WorkspaceState = {
    folders: [],
    pages: [],
    activePageId: null,
    sidebarOpen: true,
  };

  // Check if we have old drawing data to migrate
  const oldState = loadSavedCanvasState();

  const defaultPageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const defaultPage: Page = {
    id: defaultPageId,
    name: 'Untitled Drawing',
    icon: 'PenTool',
    folderId: null,
    mode: 'drawing',
    favorite: false,
    drawingData: oldState as CanvasState | null,
    noteData: { content: '' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  newWorkspace.pages.push(defaultPage);
  newWorkspace.activePageId = defaultPageId;

  saveWorkspaceState(newWorkspace);

  return newWorkspace;
}
