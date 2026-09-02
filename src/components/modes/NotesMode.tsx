import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NoteEditor } from './NoteEditor';
import { ShareModal } from '../ShareModal';
import { EmojiPicker } from '../workspace/EmojiPicker';
import { MovePageModal } from '../workspace/MovePageModal';
import { ConfirmModal } from '../workspace/ConfirmModal';
import {
  PenTool,
  FileText,
  Star,
  Share2,
  MoreHorizontal,
  Menu,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Edit2,
  Copy,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { PageIcon } from '../PageIcon';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── More Menu ────────────────────────────────────────────────────────────────

interface MoreMenuProps {
  onRename: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  onDelete: () => void;
  onClose: () => void;
}

const MoreMenu: React.FC<MoreMenuProps> = ({
  onRename, onDuplicate, onMove, onFavorite, isFavorite, onDelete, onClose
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const items = [
    { label: 'Rename', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: onRename },
    { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: onDuplicate },
    { label: 'Move', icon: <ArrowRight className="w-3.5 h-3.5" />, onClick: onMove },
    { label: isFavorite ? 'Unfavorite' : 'Favorite', icon: <Star className="w-3.5 h-3.5" />, onClick: onFavorite },
    { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#1e1e28] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-fadeIn"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
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

// ─── Main NotesMode ───────────────────────────────────────────────────────────

export const NotesMode: React.FC = () => {
  const {
    workspace,
    activePage,
    sidebarOpen,
    setSidebarOpen,
    changePageMode,
    renamePage,
    updatePageNoteData,
    updatePageIcon,
    toggleFavorite,
    duplicatePage,
    deletePage,
    movePage,
  } = useWorkspace();

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showShare, setShowShare] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync title input when page changes
  useEffect(() => {
    if (activePage) {
      setTitleInput(activePage.name);
    }
  }, [activePage?.id]);

  // Theme sync
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Debounced save for note content
  const handleContentChange = useCallback((newContent: any[]) => {
    if (!activePage) return;
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updatePageNoteData(activePage.id, { content: newContent });
      setSaveStatus('saved');
    }, 600);
  }, [activePage?.id, updatePageNoteData]);

  // Title commit
  const commitTitle = () => {
    if (!activePage) return;
    const trimmed = titleInput.trim() || 'Untitled';
    setTitleInput(trimmed);
    renamePage(activePage.id, trimmed);
    setIsEditingTitle(false);
  };

  if (!activePage || !activePage.noteData) return null;

  // Breadcrumb
  const folder = workspace.folders.find((f) => f.id === activePage.folderId);
  const breadcrumbs: { label: string; id?: string }[] = [
    { label: 'Workspace' },
    ...(folder ? [{ label: folder.name, id: folder.id }] : []),
    { label: activePage.name },
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#111113] overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/60 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md shrink-0 z-30">
        {/* Left: Hamburger + Mode Switcher */}
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => changePageMode(activePage.id, 'drawing')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <PenTool className="w-3.5 h-3.5" />
              Drawing
            </button>
            <button
              onClick={() => changePageMode(activePage.id, 'notes')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Notes
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleFavorite(activePage.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              activePage.favorite
                ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${activePage.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            {activePage.favorite ? 'Favorited' : 'Favorite'}
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((p) => !p)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMoreMenu && (
              <MoreMenu
                onRename={() => { setIsEditingTitle(true); setTimeout(() => titleRef.current?.select(), 50); }}
                onDuplicate={() => duplicatePage(activePage.id)}
                onMove={() => setShowMoveModal(true)}
                onFavorite={() => toggleFavorite(activePage.id)}
                isFavorite={activePage.favorite}
                onDelete={() => setShowDeleteConfirm(true)}
                onClose={() => setShowMoreMenu(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── Document Area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-8 lg:px-16 pt-12 pb-32">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mb-6">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={`${i === breadcrumbs.length - 1 ? 'text-slate-600 dark:text-slate-400 font-medium' : 'hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer transition-colors'}`}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {/* Page Icon */}
          <div className="mb-3">
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Change icon"
            >
              <PageIcon icon={activePage.icon} className="w-10 h-10" />
            </button>
          </div>

          {/* Page Title */}
          <div className="mb-2">
            <input
              ref={titleRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onFocus={() => setIsEditingTitle(true)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitle(); titleRef.current?.blur(); }
                if (e.key === 'Escape') { setTitleInput(activePage.name); titleRef.current?.blur(); }
              }}
              placeholder="Untitled"
              className="w-full text-4xl font-bold text-slate-900 dark:text-slate-50 bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-tight"
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-10">
            <span>Last edited {timeAgo(activePage.updatedAt)}</span>
            <span>•</span>
            <span>Created {formatDate(activePage.createdAt)}</span>
          </div>

          {/* BlockNote Editor */}
          <div className="notes-editor-container">
            <NoteEditor
              initialContent={activePage.noteData.content}
              onChange={handleContentChange}
              theme={theme}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Status Bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-end px-6 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-white/95 dark:bg-[#111113]/95">
        {saveStatus === 'saving' ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved just now
          </span>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        isConnected={false}
        roomId={null}
        remoteUsers={[]}
        myColor="#6965db"
        myUsername="You"
      />
      <EmojiPicker
        isOpen={showEmojiPicker}
        onSelect={(emoji) => updatePageIcon(activePage.id, emoji)}
        onClose={() => setShowEmojiPicker(false)}
      />
      {showMoveModal && (
        <MovePageModal
          isOpen={showMoveModal}
          pageId={activePage.id}
          onClose={() => setShowMoveModal(false)}
        />
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete page?"
        message={`Delete "${activePage.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { deletePage(activePage.id); setShowDeleteConfirm(false); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
