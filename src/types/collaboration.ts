export interface CollabUser {
  socketId: string;
  userId: string;
  username: string;
  color: string;
  cursor: { x: number; y: number };
}

export interface RemoteCursor {
  socketId: string;
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

export interface ChatMessage {
  id: string;
  socketId: string;
  username: string;
  color: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// ── WebSocket message payloads ────────────────────────────────────────────────

export interface RoomJoinedPayload {
  userId: string;
  color: string;
  users: CollabUser[];
}

export interface UserJoinedPayload {
  user: CollabUser;
}

export interface UserLeftPayload {
  socketId: string;
  userId: string;
  username: string;
}

export interface ElementUpdatePayload {
  element: import('./whiteboard').WhiteboardElement;
  senderId: string;
}

export interface ElementDeletePayload {
  elementIds: string[];
  senderId: string;
}

export interface CanvasClearPayload {
  senderId: string;
}

export interface CursorMovePayload {
  socketId: string;
  x: number;
  y: number;
}

export interface ChatMessagePayload {
  message: ChatMessage;
}

// ── Collaboration state exposed by useCollaboration ──────────────────────────

export interface CollaborationState {
  isConnected: boolean;
  roomId: string | null;
  myColor: string;
  myUsername: string;
  remoteUsers: CollabUser[];
  remoteCursors: RemoteCursor[];
  chatMessages: ChatMessage[];
  broadcastElementUpdate: (element: import('./whiteboard').WhiteboardElement) => void;
  broadcastElementDelete: (elementIds: string[]) => void;
  broadcastCanvasClear: () => void;
  broadcastCursorMove: (x: number, y: number) => void;
  broadcastChatMessage: (text: string) => void;
}
