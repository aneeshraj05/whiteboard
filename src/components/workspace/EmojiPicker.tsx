import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PageIcon } from '../PageIcon';

interface EmojiPickerProps {
  isOpen: boolean;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

const ICON_GROUPS = [
  {
    label: 'Documents',
    items: ['FileText', 'File', 'FileCode', 'FileSpreadsheet', 'FileJson', 'FileBox', 'Book', 'BookOpen', 'Newspaper', 'ClipboardList'],
  },
  {
    label: 'Knowledge',
    items: ['Library', 'GraduationCap', 'Brain', 'Lightbulb', 'Microscope', 'Telescope', 'PenTool', 'Edit3', 'Highlighter', 'Glasses'],
  },
  {
    label: 'Work',
    items: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Smartphone', 'Settings', 'Wrench', 'Hammer', 'Briefcase', 'Coffee'],
  },
  {
    label: 'Goals',
    items: ['Target', 'Rocket', 'Star', 'Flame', 'Zap', 'Gem', 'Trophy', 'Medal', 'CheckCircle', 'AlertCircle'],
  },
  {
    label: 'Art & Design',
    items: ['Palette', 'Brush', 'Pen', 'Clapperboard', 'Music', 'Guitar', 'Mic', 'Image', 'Camera', 'Video'],
  },
  {
    label: 'People & Life',
    items: ['Heart', 'Users', 'UserCircle', 'Globe', 'Leaf', 'Sun', 'Moon', 'Cloud', 'Umbrella', 'Coffee'],
  },
  {
    label: 'Misc',
    items: ['Pin', 'MapPin', 'Bookmark', 'Tag', 'Folder', 'FolderOpen', 'Archive', 'Lock', 'Key', 'Shield'],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ isOpen, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative z-10 w-80 bg-white dark:bg-[#1e1e28] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-fadeIn">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Choose icon</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/40 mb-3 text-slate-900 dark:text-slate-100"
          autoFocus
        />

        <div className="overflow-y-auto max-h-64 custom-scrollbar">
          {ICON_GROUPS.map((group) => {
            const visibleItems = group.items.filter(item => 
              item.toLowerCase().includes(search.toLowerCase())
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 px-1">
                  {group.label}
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {visibleItems.map((iconName) => (
                    <button
                      key={iconName}
                      onClick={() => {
                        onSelect(iconName);
                        onClose();
                      }}
                      className="flex items-center justify-center p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-600 dark:text-slate-300 transition-colors"
                      title={iconName}
                    >
                      <PageIcon icon={iconName} className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
