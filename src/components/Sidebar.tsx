import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  Plus,
  Copy,
  ArrowRight,
  Star,
  Search,
  PanelLeftClose,
  FolderPlus,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { CreatePageModal } from './workspace/CreatePageModal';
import { CreateFolderModal } from './workspace/CreateFolderModal';
import { MovePageModal } from './workspace/MovePageModal';
import { ConfirmModal } from './workspace/ConfirmModal';
import { PageMode } from '../types/workspace';
import { PageIcon } from './PageIcon';

let lastMenuToggleTime = 0;

// ─── InlineRenameInput ────────────────────────────────────────────────────────

interface InlineRenameProps {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}

const InlineRenameInput: React.FC<InlineRenameProps> = ({ value, onSave, onCancel }) => {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.select();
  }, []);

  const commit = () => onSave(text.trim() || value);

  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.stopPropagation(); commit(); }
        if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-brand-400 rounded px-1.5 py-0.5 text-sm outline-none text-slate-900 dark:text-slate-100"
    />
  );
};

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface CtxMenuProps {
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

const ContextMenu: React.FC<CtxMenuProps> = ({ items, onClose, anchorRef }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Popup is w-44 (176px). Align its right edge with the button's right edge.
      // This ensures it stays entirely within the sidebar bounds.
      setStyle({
        position: 'fixed',
        top: Math.min(rect.bottom + 4, window.innerHeight - 200),
        left: rect.right - 176,
        zIndex: 1000,
        visibility: 'visible',
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (anchorRef.current && anchorRef.current.contains(e.target as Node)) {
          return; // Let the anchor's onClick handle it
        }
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose, anchorRef]);

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed w-44 bg-white dark:bg-[#1e1e28] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-fadeIn"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
          className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${
            item.danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export const Sidebar: React.FC = () => {
  const {
    workspace,
    activePage,
    sidebarOpen,
    setSidebarOpen,
    setActivePage,
    renamePage,
    deletePage,
    duplicatePage,
    toggleFavorite,
    renameFolder,
    deleteFolder,
    createPage,
  } = useWorkspace();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(
    workspace.folders.map((f) => f.id) // start expanded
  ));
  const [search, setSearch] = useState('');
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [pageCtxId, setPageCtxId] = useState<string | null>(null);
  const [folderCtxId, setFolderCtxId] = useState<string | null>(null);
  const pageCtxRef = useRef<HTMLButtonElement>(null);
  const folderCtxRef = useRef<HTMLButtonElement>(null);

  // Modals
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [createPageFolderId, setCreatePageFolderId] = useState<string | null>(null);
  const [createPageMode, setCreatePageMode] = useState<PageMode>('notes');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [movingPageId, setMovingPageId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'page' | 'folder'; id: string; name: string } | null>(null);

  if (!sidebarOpen) return null;

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openCreatePage = (folderId: string | null, mode: PageMode) => {
    setCreatePageFolderId(folderId);
    setCreatePageMode(mode);
    setShowCreatePage(true);
    if (folderId) setExpandedFolders((prev) => new Set(prev).add(folderId));
  };

  const filteredPages = search.trim()
    ? workspace.pages.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const rootPages = workspace.pages.filter((p) => p.folderId === null);

  // Page context menu items
  const pageCtxItems = (pageId: string) => {
    const page = workspace.pages.find((p) => p.id === pageId)!;
    return [
      { label: 'Rename', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => setRenamingPageId(pageId) },
      { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => duplicatePage(pageId) },
      { label: 'Move', icon: <ArrowRight className="w-3.5 h-3.5" />, onClick: () => setMovingPageId(pageId) },
      { label: page.favorite ? 'Unfavorite' : 'Favorite', icon: <Star className="w-3.5 h-3.5" />, onClick: () => toggleFavorite(pageId) },
      { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setConfirmDelete({ type: 'page', id: pageId, name: page.name }), danger: true },
    ];
  };

  // Folder context menu items
  const folderCtxItems = (folderId: string) => {
    const folder = workspace.folders.find((f) => f.id === folderId)!;
    return [
      { label: 'New Page', icon: <FilePlus className="w-3.5 h-3.5" />, onClick: () => openCreatePage(folderId, activePage?.mode ?? 'notes') },
      { label: 'Rename', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => setRenamingFolderId(folderId) },
      { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setConfirmDelete({ type: 'folder', id: folderId, name: folder.name }), danger: true },
    ];
  };

  const PageItem: React.FC<{ pageId: string; indent?: boolean }> = ({ pageId, indent = false }) => {
    const page = workspace.pages.find((p) => p.id === pageId);
    if (!page) return null;
    const isActive = activePage?.id === pageId;
    const isRenaming = renamingPageId === pageId;
    const isCtxOpen = pageCtxId === pageId;

    return (
      <div
        onClick={(e) => {
          if (e.detail > 1) return; // Prevent double-click interference
          if (!isRenaming) setActivePage(pageId);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!isRenaming) {
            setPageCtxId(pageId);
            setFolderCtxId(null);
          }
        }}
        className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all ${
          isActive
            ? 'bg-brand-50 dark:bg-brand-900/25 text-brand-700 dark:text-brand-400'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
        } ${indent ? 'ml-5' : ''}`}
      >
        <span className="shrink-0 text-slate-500 dark:text-slate-400">
          <PageIcon icon={page.icon} className="w-4 h-4" />
        </span>
        {isRenaming ? (
          <InlineRenameInput
            value={page.name}
            onSave={(v) => { renamePage(pageId, v); setRenamingPageId(null); }}
            onCancel={() => setRenamingPageId(null)}
          />
        ) : (
          <span className={`text-sm flex-1 truncate font-medium ${isActive ? '' : 'font-normal'}`}>{page.name}</span>
        )}
        {page.favorite && !isRenaming && (
          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
        )}
        {!isRenaming && (
          <div className="relative">
            <button
              ref={isCtxOpen ? pageCtxRef : undefined}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (e.detail > 1) return; // Stop double click from rapidly toggling
                const now = Date.now();
                if (now - lastMenuToggleTime < 300) return; // Stop rapid tapping on mobile
                lastMenuToggleTime = now;
                setPageCtxId(isCtxOpen ? null : pageId); 
                setFolderCtxId(null); 
              }}
              className={`p-1 rounded-md transition-colors ${isCtxOpen ? 'opacity-100 bg-slate-200 dark:bg-slate-700' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {isCtxOpen && (
              <ContextMenu
                items={pageCtxItems(pageId)}
                onClose={() => setPageCtxId(null)}
                anchorRef={pageCtxRef}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="w-60 h-full bg-slate-50 dark:bg-[#151518] border-r border-slate-200/80 dark:border-slate-800 flex flex-col select-none transition-all">
        {/* Header */}
        <div className="px-3 pt-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Workspace</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Top actions */}
        <div className="px-3 pb-2 flex gap-1.5">
          <button
            onClick={() => openCreatePage(null, activePage?.mode ?? 'notes')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" /> New Page
          </button>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New Folder
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="text-xs bg-transparent outline-none flex-1 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800 mx-3 mb-2" />

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 custom-scrollbar">
          {/* Search results */}
          {filteredPages ? (
            filteredPages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No pages found</p>
            ) : (
              filteredPages.map((p) => <PageItem key={p.id} pageId={p.id} />)
            )
          ) : (
            <>
              {/* Folders */}
              {workspace.folders.map((folder) => {
                const isExpanded = expandedFolders.has(folder.id);
                const folderPages = workspace.pages.filter((p) => p.folderId === folder.id);
                const isRenamingFolder = renamingFolderId === folder.id;
                const isCtxOpen = folderCtxId === folder.id;

                return (
                  <div key={folder.id}>
                    <div
                      onClick={(e) => {
                        if (e.detail > 1) return; // Prevent double-click interference
                        if (!isRenamingFolder) toggleFolder(folder.id);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isRenamingFolder) {
                          setFolderCtxId(folder.id);
                          setPageCtxId(null);
                        }
                      }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-slate-400 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-brand-500 fill-brand-500/20 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-brand-500 fill-brand-500/20 shrink-0" />
                      )}
                      {isRenamingFolder ? (
                        <InlineRenameInput
                          value={folder.name}
                          onSave={(v) => { renameFolder(folder.id, v); setRenamingFolderId(null); }}
                          onCancel={() => setRenamingFolderId(null)}
                        />
                      ) : (
                        <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
                      )}
                      {!isRenamingFolder && (
                        <div className="relative">
                          <button
                            ref={isCtxOpen ? folderCtxRef : undefined}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (e.detail > 1) return; // Stop double click from rapidly toggling
                              const now = Date.now();
                              if (now - lastMenuToggleTime < 300) return; // Stop rapid tapping on mobile
                              lastMenuToggleTime = now;
                              setFolderCtxId(isCtxOpen ? null : folder.id); 
                              setPageCtxId(null); 
                            }}
                            className={`p-1 rounded-md transition-colors ${isCtxOpen ? 'opacity-100 bg-slate-200 dark:bg-slate-700' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {isCtxOpen && (
                            <ContextMenu
                              items={folderCtxItems(folder.id)}
                              onClose={() => setFolderCtxId(null)}
                              anchorRef={folderCtxRef}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700/60 space-y-0.5 mb-1">
                        {folderPages.map((p) => <PageItem key={p.id} pageId={p.id} indent />)}
                        {folderPages.length === 0 && (
                          <button
                            onClick={() => openCreatePage(folder.id, activePage?.mode ?? 'notes')}
                            className="flex items-center gap-1.5 px-2 py-1.5 w-full text-left text-xs text-slate-400 hover:text-brand-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3 h-3" /> Add page
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Root Pages */}
              {rootPages.map((p) => <PageItem key={p.id} pageId={p.id} />)}

              {/* Empty state */}
              {workspace.folders.length === 0 && rootPages.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm mb-3">No pages yet</p>
                  <button
                    onClick={() => openCreatePage(null, 'notes')}
                    className="text-xs text-brand-500 hover:underline"
                  >
                    Create your first page →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Collapse Button */}
        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full"
          >
            <PanelLeftClose className="w-4 h-4" />
            Collapse sidebar
            <kbd className="ml-auto text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">⌘\</kbd>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreatePageModal
        isOpen={showCreatePage}
        defaultMode={createPageMode}
        defaultFolderId={createPageFolderId}
        onClose={() => setShowCreatePage(false)}
      />
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
      />
      {movingPageId && (
        <MovePageModal
          isOpen={!!movingPageId}
          pageId={movingPageId}
          onClose={() => setMovingPageId(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title={`Delete ${confirmDelete?.type === 'folder' ? 'folder' : 'page'}?`}
        message={
          confirmDelete?.type === 'folder'
            ? `Delete "${confirmDelete.name}" and move its pages to root?`
            : `Delete "${confirmDelete?.name}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDelete?.type === 'page') deletePage(confirmDelete.id);
          else if (confirmDelete?.type === 'folder') deleteFolder(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
};
