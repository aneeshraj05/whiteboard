import React, { useState } from 'react';
import { X, Share2, Copy, Check, Users, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CollabUser } from '../types/collaboration';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Collaboration state passed from parent */
  isConnected: boolean;
  roomId: string | null;
  remoteUsers: CollabUser[];
  myColor: string;
  myUsername: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  roomId,
  remoteUsers,
  myColor,
  myUsername,
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}#room=${roomId || ''}`;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => setCopied(false), 2000);
  };

  // Total count = remote users + yourself
  const totalCount = remoteUsers.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

      <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e24] shadow-2xl rounded-2xl p-6 z-10 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Live Collaboration</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            {roomId && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {isConnected
                  ? <><Wifi className="w-3 h-3" /> Connected</>
                  : <><WifiOff className="w-3 h-3" /> Offline</>
                }
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 bg-brand-50/50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50 rounded-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Real-Time Collaboration</p>
              <p>Anyone with this link can join and draw in real-time on your whiteboard.</p>
            </div>
          </div>

          {/* Share link */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Collaboration Link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="share-link-input"
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
              />
              <button
                id="share-copy-btn"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all"
              >
                {copied ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Presence section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                {totalCount === 1 ? '1 person in room' : `${totalCount} people in room`}
              </span>
              <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Room #{roomId}
              </span>
            </div>

            {/* User list */}
            <div className="flex flex-col gap-1.5">
              {/* Yourself */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div
                  className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: myColor }}
                >
                  {myUsername ? myUsername.charAt(0).toUpperCase() : 'Y'}
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                  {myUsername || 'You'}
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">You</span>
              </div>

              {/* Remote users */}
              {remoteUsers.map((user) => (
                <div
                  key={user.socketId}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                    {user.username}
                  </span>
                  {/* Live indicator dot */}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
