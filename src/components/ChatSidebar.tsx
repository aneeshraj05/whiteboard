import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, MessageSquare, Smile } from 'lucide-react';
import { ChatMessage } from '../types/collaboration';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  mySocketId: string;
  onSendMessage: (text: string) => void;
  isConnected: boolean;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🤔'];

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  messages,
  mySocketId,
  onSendMessage,
  isConnected,
}) => {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !isConnected) return;
    onSendMessage(text);
    setInput('');
    setShowEmoji(false);
    inputRef.current?.focus();
  }, [input, isConnected, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:hidden"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div
        className="absolute right-0 top-0 bottom-0 z-40 flex flex-col w-[320px] bg-white dark:bg-[#18181f] border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-slideInRight"
        style={{ animationDuration: '0.22s' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#18181f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-500/10 rounded-lg">
              <MessageSquare className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Room Chat</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {isConnected ? 'Connected · messages are live' : 'Offline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 dark:text-slate-600">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p className="text-xs text-center">No messages yet.<br />Say hi to your collaborators!</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.socketId === mySocketId;
            const isSystem = msg.isSystem;
            const prevMsg = messages[i - 1];
            const sameAuthor = !isSystem && prevMsg && prevMsg.socketId === msg.socketId && !prevMsg.isSystem;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-0.5 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${sameAuthor ? 'mt-0.5' : 'mt-2'}`}
              >
                {/* Author + time (only first message in a group) */}
                {!sameAuthor && (
                  <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: msg.color }}
                    >
                      {msg.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {isMe ? 'You' : msg.username}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-600">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[220px] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'rounded-tr-sm text-white'
                      : 'rounded-tl-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                  style={isMe ? { backgroundColor: msg.color } : undefined}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Quick reactions */}
        {showEmoji && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 animate-fadeIn shrink-0">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSendMessage(emoji);
                  setShowEmoji(false);
                }}
                className="text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 px-3 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#18181f]">
          {!isConnected && (
            <div className="mb-2 text-center text-[11px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1">
              Join a room to send messages
            </div>
          )}
          <div className={`flex items-end gap-2 p-2 rounded-xl border transition-colors ${
            isConnected
              ? 'border-slate-200 dark:border-slate-700 focus-within:border-brand-400 dark:focus-within:border-brand-500'
              : 'border-slate-100 dark:border-slate-800 opacity-60'
          } bg-slate-50 dark:bg-slate-800/50`}>
            <button
              onClick={() => setShowEmoji((p) => !p)}
              disabled={!isConnected}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 mb-0.5"
              title="Quick reactions"
            >
              <Smile className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              placeholder={isConnected ? 'Type a message… (Enter to send)' : 'Not connected'}
              rows={1}
              className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none outline-none leading-relaxed min-h-[20px] max-h-[80px]"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={handleSend}
              disabled={!isConnected || !input.trim()}
              className="shrink-0 p-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all text-white mb-0.5"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-300 dark:text-slate-700">
            Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
};
