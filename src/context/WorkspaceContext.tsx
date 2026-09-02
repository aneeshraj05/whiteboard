import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WorkspaceState, Folder, Page, PageMode, NoteData } from '../types/workspace';
import { migrateToWorkspaceIfNeeded, saveWorkspaceState } from '../utils/storage';
import { CanvasState } from '../types/whiteboard';

interface WorkspaceContextType {
  workspace: WorkspaceState;
  activePage: Page | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  createPage: (name: string, mode: PageMode, folderId: string | null) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  movePage: (id: string, folderId: string | null) => void;
  changePageMode: (id: string, mode: PageMode) => void;
  setActivePage: (id: string) => void;
  updatePageDrawingData: (id: string, data: CanvasState) => void;
  updatePageNoteData: (id: string, data: NoteData) => void;
  updatePageIcon: (id: string, icon: string) => void;
  toggleFavorite: (id: string) => void;
  duplicatePage: (id: string) => void;
  createFolder: (name: string, parentId: string | null) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<WorkspaceState>(migrateToWorkspaceIfNeeded());

  useEffect(() => {
    saveWorkspaceState(workspace);
  }, [workspace]);

  const activePage = workspace.pages.find((p) => p.id === workspace.activePageId) || null;

  const setSidebarOpen = useCallback((open: boolean) => {
    setWorkspace((prev) => ({ ...prev, sidebarOpen: open }));
  }, []);

  const createPage = useCallback((name: string, mode: PageMode, folderId: string | null) => {
    const newPage: Page = {
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      icon: mode === 'drawing' ? 'PenTool' : 'FileText',
      folderId,
      mode,
      favorite: false,
      drawingData: null,
      noteData: { content: '' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setWorkspace((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
      activePageId: newPage.id,
    }));
  }, []);

  const deletePage = useCallback((id: string) => {
    setWorkspace((prev) => {
      const newPages = prev.pages.filter((p) => p.id !== id);
      const newActiveId = prev.activePageId === id
        ? (newPages.length > 0 ? newPages[0].id : null)
        : prev.activePageId;
      return { ...prev, pages: newPages, activePageId: newActiveId };
    });
  }, []);

  const renamePage = useCallback((id: string, name: string) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const movePage = useCallback((id: string, folderId: string | null) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, folderId, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const changePageMode = useCallback((id: string, mode: PageMode) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== id) return p;
        let newIcon = p.icon;
        const isDefaultOldIcon = p.icon === 'PenTool' || p.icon === 'FileText' || p.icon === '📄' || p.icon === '🎨';
        if (isDefaultOldIcon) {
          newIcon = mode === 'drawing' ? 'PenTool' : 'FileText';
        }
        return { ...p, mode, icon: newIcon, noteData: p.noteData || { content: '' }, updatedAt: Date.now() };
      }),
    }));
  }, []);

  const setActivePage = useCallback((id: string) => {
    setWorkspace((prev) => ({ ...prev, activePageId: id }));
  }, []);

  const updatePageDrawingData = useCallback((id: string, data: CanvasState) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, drawingData: data, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const updatePageNoteData = useCallback((id: string, data: NoteData) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, noteData: data, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const updatePageIcon = useCallback((id: string, icon: string) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, icon, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, favorite: !p.favorite, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const duplicatePage = useCallback((id: string) => {
    setWorkspace((prev) => {
      const original = prev.pages.find((p) => p.id === id);
      if (!original) return prev;
      const duplicate: Page = {
        ...original,
        id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: `${original.name} (Copy)`,
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        ...prev,
        pages: [...prev.pages, duplicate],
        activePageId: duplicate.id,
      };
    });
  }, []);

  const createFolder = useCallback((name: string, parentId: string | null) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setWorkspace((prev) => ({
      ...prev,
      folders: [...prev.folders, newFolder],
    }));
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.id === id ? { ...f, name, updatedAt: Date.now() } : f)),
    }));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.filter((f) => f.id !== id),
      pages: prev.pages.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)),
    }));
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        activePage,
        sidebarOpen: workspace.sidebarOpen,
        setSidebarOpen,
        createPage,
        deletePage,
        renamePage,
        movePage,
        changePageMode,
        setActivePage,
        updatePageDrawingData,
        updatePageNoteData,
        updatePageIcon,
        toggleFavorite,
        duplicatePage,
        createFolder,
        renameFolder,
        deleteFolder,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
};
