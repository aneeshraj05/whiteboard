export type ToolType =
  // Core tools
  | 'selection'
  | 'lasso'
  | 'pan'
  | 'draw'
  | 'text'
  | 'image'
  | 'eraser'
  | 'laser'
  // Basic shapes
  | 'rectangle'
  | 'rounded-rectangle'
  | 'ellipse'
  | 'diamond'
  | 'triangle'
  | 'right-triangle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star'
  | 'burst'
  // Connectors
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'curved-arrow'
  | 'elbow-connector'
  | 'dashed-arrow'
  // Flowchart shapes
  | 'process'
  | 'decision'
  | 'input-output'
  | 'document'
  | 'database'
  | 'terminator'
  | 'predefined-process'
  | 'manual-input'
  | 'delay'
  // Diagram shapes
  | 'cloud'
  | 'cylinder'
  | 'folder'
  | 'server'
  | 'person'
  | 'message'
  | 'speech-bubble'
  | 'callout';

export type BackgroundPattern = 
  | 'blank'
  | 'dotted'
  | 'fine-dotted'
  | 'grid'
  | 'large-grid'
  | 'notebook'
  | 'graph-paper'
  | 'isometric';

export type FillStyle = 'none' | 'hachure' | 'cross-hatch' | 'solid' | 'zigzag';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type RoughnessLevel = 0 | 1 | 2; // 0 = Architect (clean), 1 = Artist (sketchy), 2 = Cartoonist (extra messy)
export type StrokeWidth = 1 | 2 | 4 | 6; // Thin, Medium, Bold, Extra Bold
export type FontFamily = 'Kalam' | 'Caveat' | 'Architects Daughter' | 'Inter';
export type TextAlign = 'left' | 'center' | 'right';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type ResizeHandle = 
  | 'nw' | 'n' | 'ne'
  | 'w'         | 'e'
  | 'sw' | 's' | 'se'
  | 'rotation';

export interface WhiteboardElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // in radians
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: StrokeWidth;
  strokeStyle: StrokeStyle;
  roughness: RoughnessLevel;
  roundness: boolean;
  opacity: number; // 0 to 100
  points?: Point[]; // for draw, line, arrow
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
  imageDataUrl?: string;
  isLocked?: boolean;
  groupId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasState {
  elements: WhiteboardElement[];
  selectedElementIds: string[];
  activeTool: ToolType;
  isToolLocked: boolean;
  zoom: number; // 0.1 to 5.0
  scrollX: number;
  scrollY: number;
  theme: 'light' | 'dark';
  canvasBackground: string;
  backgroundPattern: BackgroundPattern;
  gridEnabled: boolean;
}

export interface DragState {
  type: 'none' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'panning' | 'selecting' | 'lasso' | 'erasing';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  activeHandle?: ResizeHandle;
  initialElementsSnapshot?: WhiteboardElement[];
  selectionBox?: { startX: number; startY: number; endX: number; endY: number };
  lassoPoints?: Point[];
}

export interface LaserPoint {
  x: number;
  y: number;
  time: number;
}

export const STROKE_COLORS = [
  '#1e1e1e', // Pitch Black
  '#e03131', // Crimson
  '#e64980', // Pink
  '#be4bdb', // Grape
  '#7950f2', // Violet
  '#4c6ef5', // Indigo
  '#228be6', // Blue
  '#15aabf', // Cyan
  '#12b886', // Teal
  '#40c057', // Green
  '#fab005', // Yellow
  '#fd7e14', // Orange
  '#868e96', // Slate Gray
];

export const BACKGROUND_COLORS = [
  'transparent',
  '#ffc9c9',
  '#fcc2d7',
  '#eebefa',
  '#d0bfff',
  '#bac8ff',
  '#a5d8ff',
  '#99e9f2',
  '#96f2d7',
  '#b2f2bb',
  '#ffec99',
  '#ffd8a8',
  '#e9ecef',
];
