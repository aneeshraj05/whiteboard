import React from 'react';
import { ToolType } from '../types/whiteboard';

export type ShapeCategory = 'basic' | 'flowchart' | 'diagram' | 'connectors';

export interface ShapeDefinition {
  id: ToolType;
  label: string;
  category: ShapeCategory;
  /** Renders a tiny SVG icon (24×24 viewBox) */
  icon: () => React.JSX.Element;
}

// ─── SVG Icon helpers ─────────────────────────────────────────────────────────

const S = (path: string, extra?: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...(extra ? {} : {})}>
    <path d={path} />
  </svg>
);

const Poly = (points: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points={points} />
  </svg>
);

const Multi = (...children: React.JSX.Element[]) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {children}
  </svg>
);

// ─── Shape Registry ───────────────────────────────────────────────────────────

export const shapeRegistry: ShapeDefinition[] = [
  // ── BASIC ──────────────────────────────────────────────────────────────────
  {
    id: 'rectangle',
    label: 'Rectangle',
    category: 'basic',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="6" width="18" height="12" />
      </svg>
    ),
  },
  {
    id: 'rounded-rectangle',
    label: 'Rounded Rectangle',
    category: 'basic',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="6" width="18" height="12" rx="4" />
      </svg>
    ),
  },
  {
    id: 'ellipse',
    label: 'Circle / Ellipse',
    category: 'basic',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <ellipse cx="12" cy="12" rx="9" ry="6" />
      </svg>
    ),
  },
  {
    id: 'diamond',
    label: 'Diamond',
    category: 'basic',
    icon: () => Poly('12,3 21,12 12,21 3,12'),
  },
  {
    id: 'triangle',
    label: 'Triangle',
    category: 'basic',
    icon: () => Poly('12,3 22,21 2,21'),
  },
  {
    id: 'right-triangle',
    label: 'Right Triangle',
    category: 'basic',
    icon: () => Poly('3,21 21,21 3,5'),
  },
  {
    id: 'pentagon',
    label: 'Pentagon',
    category: 'basic',
    icon: () => Poly('12,2 22,9 18,20 6,20 2,9'),
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    category: 'basic',
    icon: () => Poly('12,2 20,7 20,17 12,22 4,17 4,7'),
  },
  {
    id: 'octagon',
    label: 'Octagon',
    category: 'basic',
    icon: () => Poly('8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8'),
  },
  {
    id: 'star',
    label: 'Star',
    category: 'basic',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ),
  },
  {
    id: 'burst',
    label: 'Burst',
    category: 'basic',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="12,1 14,8 21,5 16,11 23,12 16,13 21,19 14,16 12,23 10,16 3,19 8,13 1,12 8,11 3,5 10,8" />
      </svg>
    ),
  },

  // ── FLOWCHART ───────────────────────────────────────────────────────────────
  {
    id: 'process',
    label: 'Process',
    category: 'flowchart',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="7" width="18" height="10" />
      </svg>
    ),
  },
  {
    id: 'decision',
    label: 'Decision',
    category: 'flowchart',
    icon: () => Poly('12,3 22,12 12,21 2,12'),
  },
  {
    id: 'input-output',
    label: 'Input / Output',
    category: 'flowchart',
    icon: () => Poly('6,7 20,7 18,17 4,17'),
  },
  {
    id: 'document',
    label: 'Document',
    category: 'flowchart',
    icon: () => S('M4,5 H20 V16 Q16,20 12,16 Q8,12 4,16 Z'),
  },
  {
    id: 'database',
    label: 'Database',
    category: 'flowchart',
    icon: () => Multi(
      <ellipse cx="12" cy="7" rx="9" ry="3" />,
      <path d="M3,7 V17 Q3,20 12,20 21,20 21,17 V7" />
    ),
  },
  {
    id: 'terminator',
    label: 'Terminator',
    category: 'flowchart',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="7" width="18" height="10" rx="5" />
      </svg>
    ),
  },
  {
    id: 'predefined-process',
    label: 'Predefined Process',
    category: 'flowchart',
    icon: () => Multi(
      <rect x="3" y="7" width="18" height="10" />,
      <line x1="7" y1="7" x2="7" y2="17" />,
      <line x1="17" y1="7" x2="17" y2="17" />
    ),
  },
  {
    id: 'manual-input',
    label: 'Manual Input',
    category: 'flowchart',
    icon: () => Poly('3,10 21,7 21,17 3,17'),
  },
  {
    id: 'delay',
    label: 'Delay',
    category: 'flowchart',
    icon: () => S('M3,7 H15 Q21,7 21,12 21,17 15,17 H3 Z'),
  },

  // ── DIAGRAM ─────────────────────────────────────────────────────────────────
  {
    id: 'cloud',
    label: 'Cloud',
    category: 'diagram',
    icon: () => S('M6,19 A4,4 0 0 1 6,11 A4,4 0 0 1 10,7 A5,5 0 0 1 20,11 A3,3 0 0 1 19,17'),
  },
  {
    id: 'cylinder',
    label: 'Cylinder',
    category: 'diagram',
    icon: () => Multi(
      <ellipse cx="12" cy="7" rx="8" ry="3" />,
      <path d="M4,7 V17" />,
      <path d="M20,7 V17" />,
      <ellipse cx="12" cy="17" rx="8" ry="3" />
    ),
  },
  {
    id: 'folder',
    label: 'Folder',
    category: 'diagram',
    icon: () => S('M3,7 H11 L13,5 H21 V19 H3 Z'),
  },
  {
    id: 'server',
    label: 'Server',
    category: 'diagram',
    icon: () => Multi(
      <rect x="3" y="4" width="18" height="5" rx="1" />,
      <rect x="3" y="11" width="18" height="5" rx="1" />,
      <circle cx="7" cy="6.5" r="0.8" fill="currentColor" stroke="none" />,
      <circle cx="7" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
    ),
  },
  {
    id: 'person',
    label: 'Person',
    category: 'diagram',
    icon: () => Multi(
      <circle cx="12" cy="7" r="4" />,
      <path d="M4,21 Q4,14 12,14 20,14 20,21" />
    ),
  },
  {
    id: 'message',
    label: 'Message',
    category: 'diagram',
    icon: () => Multi(
      <rect x="3" y="6" width="18" height="13" rx="1" />,
      <polyline points="3,6 12,13 21,6" />
    ),
  },
  {
    id: 'speech-bubble',
    label: 'Speech Bubble',
    category: 'diagram',
    icon: () => S('M5,5 H19 Q21,5 21,7 V14 Q21,16 19,16 H10 L6,20 V16 H5 Q3,16 3,14 V7 Q3,5 5,5 Z'),
  },
  {
    id: 'callout',
    label: 'Callout',
    category: 'diagram',
    icon: () => S('M4,5 H20 Q22,5 22,7 V14 Q22,16 20,16 H8 L4,20 V16 Q2,16 2,14 V7 Q2,5 4,5 Z'),
  },

  // ── CONNECTORS ──────────────────────────────────────────────────────────────
  {
    id: 'line',
    label: 'Line',
    category: 'connectors',
    icon: () => Multi(<line x1="3" y1="12" x2="21" y2="12" />),
  },
  {
    id: 'arrow',
    label: 'Arrow',
    category: 'connectors',
    icon: () => Multi(
      <line x1="3" y1="12" x2="21" y2="12" />,
      <polyline points="14,6 21,12 14,18" />
    ),
  },
  {
    id: 'double-arrow',
    label: 'Double Arrow',
    category: 'connectors',
    icon: () => Multi(
      <line x1="3" y1="12" x2="21" y2="12" />,
      <polyline points="10,6 3,12 10,18" />,
      <polyline points="14,6 21,12 14,18" />
    ),
  },
  {
    id: 'curved-arrow',
    label: 'Curved Arrow',
    category: 'connectors',
    icon: () => Multi(
      <path d="M4,17 Q4,6 16,7" />,
      <polyline points="12,4 16,7 12,10" />
    ),
  },
  {
    id: 'elbow-connector',
    label: 'Elbow Connector',
    category: 'connectors',
    icon: () => Multi(
      <polyline points="3,18 3,6 21,6" />,
      <polyline points="17,2 21,6 17,10" />
    ),
  },
  {
    id: 'dashed-arrow',
    label: 'Dashed Arrow',
    category: 'connectors',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="3" y1="12" x2="18" y2="12" strokeDasharray="3 3" />
        <polyline points="14,6 21,12 14,18" />
      </svg>
    ),
  },
];

export const SHAPE_CATEGORIES: { id: ShapeCategory; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'diagram', label: 'Diagram' },
  { id: 'connectors', label: 'Connectors' },
];
