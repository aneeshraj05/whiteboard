const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

// Serve static frontend files from 'dist' if they exist
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all route to serve index.html for client-side routing
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

/**
 * Room state map:
 *   roomId -> Map<socketId, { userId, username, color, cursor: { x, y } }>
 */
const rooms = new Map();

/** Predefined palette for user avatar colors */
const USER_COLORS = [
  '#6965db', // Indigo
  '#e03131', // Crimson
  '#12b886', // Teal
  '#fd7e14', // Orange
  '#be4bdb', // Grape
  '#228be6', // Blue
  '#40c057', // Green
  '#e64980', // Pink
  '#fab005', // Yellow
  '#15aabf', // Cyan
];

function getColorForIndex(index) {
  return USER_COLORS[index % USER_COLORS.length];
}

function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── JOIN ROOM ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
    if (!roomId || !username) return;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const room = rooms.get(roomId);
    const colorIndex = room.size; // deterministic per-join order
    const user = {
      socketId: socket.id,
      userId: socket.id,
      username: username.trim().slice(0, 32),
      color: getColorForIndex(colorIndex),
      cursor: { x: 0, y: 0 },
    };
    room.set(socket.id, user);

    // Tell the joining client their assigned color + current room users
    socket.emit('room-joined', {
      userId: user.userId,
      color: user.color,
      users: getRoomUsers(roomId),
    });

    // Tell everyone else that a new user joined
    socket.to(roomId).emit('user-joined', { user });

    // System chat message: user joined
    const joinMsg = {
      id: `sys_${Date.now()}_${socket.id}`,
      socketId: 'system',
      username: 'System',
      color: '#64748b',
      text: `${user.username} joined the room`,
      timestamp: Date.now(),
      isSystem: true,
    };
    io.to(roomId).emit('chat-message', { message: joinMsg });

    console.log(`[~] ${username} joined room ${roomId} (${room.size} users)`);
  });

  // ── ELEMENT SYNC ──────────────────────────────────────────────────────────
  // A client drew / moved / resized / styled an element
  socket.on('element-update', ({ roomId, element }) => {
    if (!roomId || !element) return;
    socket.to(roomId).emit('element-update', { element, senderId: socket.id });
  });

  // A client deleted one or more elements
  socket.on('element-delete', ({ roomId, elementIds }) => {
    if (!roomId || !Array.isArray(elementIds)) return;
    socket.to(roomId).emit('element-delete', { elementIds, senderId: socket.id });
  });

  // A client cleared the whole canvas
  socket.on('canvas-clear', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('canvas-clear', { senderId: socket.id });
  });

  // ── CHAT MESSAGES ──────────────────────────────────────────────────────────
  socket.on('chat-message', ({ roomId, message }) => {
    if (!roomId || !message) return;
    // Relay to everyone else in the room
    socket.to(roomId).emit('chat-message', { message });
  });


  // ── CURSOR PRESENCE ────────────────────────────────────────────────────────
  // Throttled by the client (~30 fps); just relay to room
  socket.on('cursor-move', ({ roomId, x, y }) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room?.has(socket.id)) {
      room.get(socket.id).cursor = { x, y };
    }
    socket.to(roomId).emit('cursor-move', { socketId: socket.id, x, y });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // skip personal room
      const room = rooms.get(roomId);
      if (!room) continue;

      const user = room.get(socket.id);
      room.delete(socket.id);

      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[x] Room ${roomId} dissolved (empty)`);
      } else {
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userId: socket.id,
          username: user?.username ?? 'Unknown',
        });
        // System chat message: user left
        const leaveMsg = {
          id: `sys_${Date.now()}_${socket.id}`,
          socketId: 'system',
          username: 'System',
          color: '#64748b',
          text: `${user?.username ?? 'Someone'} left the room`,
          timestamp: Date.now(),
          isSystem: true,
        };
        io.to(roomId).emit('chat-message', { message: leaveMsg });
        console.log(`[-] ${user?.username ?? socket.id} left room ${roomId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅  Whiteboard WS server listening on http://localhost:${PORT}`);
});
