import { CanvasState } from './whiteboard';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type PageMode = 'drawing' | 'notes';

export interface NoteData {
  content: any[] | string;
}

export interface Page {
  id: string;
  name: string;
  icon: string;
  folderId: string | null;
  mode: PageMode;
  favorite: boolean;
  drawingData: CanvasState | null;
  noteData: NoteData | null;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceState {
  folders: Folder[];
  pages: Page[];
  activePageId: string | null;
  sidebarOpen: boolean;
}
