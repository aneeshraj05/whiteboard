/// <reference types="vite/client" />
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WhiteboardElement } from '../types/whiteboard';
import {
  CollabUser,
  RemoteCursor,
  ChatMessage,
  CollaborationState,
  RoomJoinedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  ElementUpdatePayload,
  ElementDeletePayload,
  CanvasClearPayload,
  CursorMovePayload,
  ChatMessagePayload,
} from '../types/collaboration';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : 'https://whiteboard-9m2z.onrender.com');

/** Throttle helper — returns a function that fires at most once per `ms` */
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

interface UseCollaborationOptions {
  roomId: string | null;
  username: string | null;
  onRemoteElementUpdate: (element: WhiteboardElement) => void;
  onRemoteElementDelete: (elementIds: string[]) => void;
  onRemoteCanvasClear: () => void;
}

export function useCollaboration({
  roomId,
  username,
  onRemoteElementUpdate,
  onRemoteElementDelete,
  onRemoteCanvasClear,
}: UseCollaborationOptions): CollaborationState {

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myColor, setMyColor] = useState('#6965db');
  const myColorRef = useRef('#6965db');
  const [myUsername] = useState(username ?? '');
  const [remoteUsers, setRemoteUsers] = useState<CollabUser[]>([]);
  const remoteUsersRef = useRef<CollabUser[]>([]);
  useEffect(() => { remoteUsersRef.current = remoteUsers; }, [remoteUsers]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Keep latest callbacks in refs so socket handlers don't stale-close over them
  const onUpdateRef = useRef(onRemoteElementUpdate);
  const onDeleteRef = useRef(onRemoteElementDelete);
  const onClearRef = useRef(onRemoteCanvasClear);
  useEffect(() => { onUpdateRef.current = onRemoteElementUpdate; }, [onRemoteElementUpdate]);
  useEffect(() => { onDeleteRef.current = onRemoteElementDelete; }, [onRemoteElementDelete]);
  useEffect(() => { onClearRef.current = onRemoteCanvasClear; }, [onRemoteCanvasClear]);

  useEffect(() => {
    if (!roomId || !username) return;

    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    // ── Connection lifecycle ─────────────────────────────────────────────────
    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, username });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setRemoteUsers([]);
      setRemoteCursors([]);
    });

    // ── Room events ──────────────────────────────────────────────────────────
    socket.on('room-joined', ({ color, users }: RoomJoinedPayload) => {
      setMyColor(color);
      myColorRef.current = color;
      setRemoteUsers(users.filter((u) => u.socketId !== socket.id));
    });

    socket.on('user-joined', ({ user }: UserJoinedPayload) => {
      setRemoteUsers((prev) => {
        const exists = prev.some((u) => u.socketId === user.socketId);
        return exists ? prev : [...prev, user];
      });
    });

    socket.on('user-left', ({ socketId }: UserLeftPayload) => {
      setRemoteUsers((prev) => prev.filter((u) => u.socketId !== socketId));
      setRemoteCursors((prev) => prev.filter((c) => c.socketId !== socketId));
    });

    // ── Element sync ─────────────────────────────────────────────────────────
    socket.on('element-update', ({ element }: ElementUpdatePayload) => {
      onUpdateRef.current(element);
    });

    socket.on('element-delete', ({ elementIds }: ElementDeletePayload) => {
      onDeleteRef.current(elementIds);
    });

    socket.on('canvas-clear', (_: CanvasClearPayload) => {
      onClearRef.current();
    });

    // ── Cursor presence ──────────────────────────────────────────────────────
    socket.on('cursor-move', ({ socketId, x, y }: CursorMovePayload) => {
      setRemoteCursors((prev) => {
        const user = remoteUsersRef.current.find((u) => u.socketId === socketId);
        const updated = prev.filter((c) => c.socketId !== socketId);
        if (user) {
          updated.push({ socketId, userId: user.userId, username: user.username, color: user.color, x, y });
        }
        return updated;
      });
    });

    // ── Chat messages ─────────────────────────────────────────────────────────
    socket.on('chat-message', ({ message }: ChatMessagePayload) => {
      setChatMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setRemoteUsers([]);
      setRemoteCursors([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username]);

  // ── Outbound emitters ─────────────────────────────────────────────────────

  const broadcastElementUpdate = useCallback((element: WhiteboardElement) => {
    socketRef.current?.emit('element-update', { roomId, element });
  }, [roomId]);

  const broadcastElementDelete = useCallback((elementIds: string[]) => {
    socketRef.current?.emit('element-delete', { roomId, elementIds });
  }, [roomId]);

  const broadcastCanvasClear = useCallback(() => {
    socketRef.current?.emit('canvas-clear', { roomId });
  }, [roomId]);

  // Throttled to ~30 fps
  const _sendCursor = useCallback(
    throttle((x: number, y: number) => {
      socketRef.current?.emit('cursor-move', { roomId, x, y });
    }, 33),
    [roomId],
  );

  const broadcastCursorMove = useCallback((x: number, y: number) => {
    _sendCursor(x, y);
  }, [_sendCursor]);

  const broadcastChatMessage = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || !text.trim()) return;
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      socketId: socket.id ?? 'local',
      username: username ?? 'You',
      color: myColorRef.current,
      text: text.trim(),
      timestamp: Date.now(),
    };
    // Add locally immediately (optimistic)
    setChatMessages((prev) => [...prev, message]);
    // Broadcast to peers
    socket.emit('chat-message', { roomId, message });
  }, [roomId, username]);

  return {
    isConnected,
    roomId,
    myColor,
    myUsername,
    remoteUsers,
    remoteCursors,
    chatMessages,
    broadcastElementUpdate,
    broadcastElementDelete,
    broadcastCanvasClear,
    broadcastCursorMove,
    broadcastChatMessage,
  };
}
