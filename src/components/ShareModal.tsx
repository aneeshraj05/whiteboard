import React, { useState } from 'react';
import { X, Share2, Copy, Check, Users, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [roomId] = useState(() => Math.random().toString(36).substring(2, 9));
  const shareUrl = `${window.location.origin}/#room=${roomId}`;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

      <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e24] shadow-2xl rounded-2xl p-6 z-10 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Live Collaboration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-brand-50/50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50 rounded-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">End-to-End Encrypted Session</p>
              <p>Anyone with this link can join and draw in real-time on your whiteboard.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Collaboration Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all"
              >
                {copied ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              1 person in room (You)
            </span>
            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Room #{roomId}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
