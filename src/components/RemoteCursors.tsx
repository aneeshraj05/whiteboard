import React from 'react';
import { RemoteCursor } from '../types/collaboration';

interface RemoteCursorsProps {
  cursors: RemoteCursor[];
  /** Canvas zoom level — used to scale the cursor position */
  zoom: number;
  /** Canvas scroll offset */
  scrollX: number;
  scrollY: number;
}

/**
 * Renders remote users' cursors as SVG pointer + name badge overlay.
 * Positioned absolutely over the canvas in screen space.
 * World coords → screen: screenX = worldX * zoom + scrollX
 */
export const RemoteCursors: React.FC<RemoteCursorsProps> = ({
  cursors,
  zoom,
  scrollX,
  scrollY,
}) => {
  if (cursors.length === 0) return null;

  return (
    <div
      id="remote-cursors-overlay"
      className="pointer-events-none absolute inset-0 overflow-hidden z-30"
    >
      {cursors.map((cursor) => {
        const screenX = cursor.x * zoom + scrollX;
        const screenY = cursor.y * zoom + scrollY;

        return (
          <div
            key={cursor.socketId}
            id={`remote-cursor-${cursor.socketId}`}
            className="absolute flex items-start gap-0.5"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(0, 0)',
              willChange: 'left, top',
            }}
          >
            {/* Cursor SVG */}
            <svg
              width="16"
              height="22"
              viewBox="0 0 16 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-sm shrink-0"
            >
              <path
                d="M0.5 0.5L0.5 18.5L5.5 13.5L9.5 21.5L12 20.5L8 12.5L15 12.5L0.5 0.5Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name badge */}
            <span
              className="mt-4 ml-0.5 px-1.5 py-0.5 rounded-md text-white text-[11px] font-semibold leading-tight whitespace-nowrap shadow-md"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};
