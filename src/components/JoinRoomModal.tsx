import React, { useState, useEffect } from 'react';
import { Users, Sparkles, ArrowRight } from 'lucide-react';

interface JoinRoomModalProps {
  roomId: string;
  onJoin: (username: string) => void;
}

const ADJECTIVES = [
  'Amber', 'Azure', 'Coral', 'Crimson', 'Golden', 'Indigo',
  'Jade', 'Lavender', 'Midnight', 'Ocean', 'Pearl', 'Ruby',
  'Scarlet', 'Silver', 'Teal', 'Violet',
];

const ANIMALS = [
  'Bear', 'Cat', 'Deer', 'Dolphin', 'Eagle', 'Elephant',
  'Fox', 'Jaguar', 'Lynx', 'Moose', 'Otter', 'Panda',
  'Parrot', 'Phoenix', 'Raven', 'Tiger', 'Wolf',
];

function generateName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

/**
 * Shown when the user opens a collaboration link (#room=...).
 * Asks for a display name before connecting to the room.
 */
export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ roomId, onJoin }) => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Pre-fill with a random name on mount
    setUsername(generateName());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    onJoin(trimmed);
  };

  const handleRandomize = () => {
    setUsername(generateName());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-[#1e1e28] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header gradient banner */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                Join Room
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                #{roomId}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Pick a display name so others know who you are on the canvas.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="relative">
              <input
                id="join-room-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={32}
                placeholder="Your display name"
                autoFocus
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              />
              {/* Randomise button */}
              <button
                type="button"
                onClick={handleRandomize}
                title="Random name"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!username.trim()}
              id="join-room-submit"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20"
            >
              Join Whiteboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
