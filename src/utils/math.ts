import { Point, WhiteboardElement, ResizeHandle } from '../types/whiteboard';

export const HANDLE_SIZE = 8;
export const ROTATION_HANDLE_OFFSET = 24;

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  scrollX: number,
  scrollY: number,
  zoom: number
): Point {
  return {
    x: (screenX - scrollX) / zoom,
    y: (screenY - scrollY) / zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  scrollX: number,
  scrollY: number,
  zoom: number
): Point {
  return {
    x: worldX * zoom + scrollX,
    y: worldY * zoom + scrollY,
  };
}

export function getElementBounds(element: WhiteboardElement): BoundingBox {
  if (element.type === 'draw' || element.type === 'line' || element.type === 'arrow' || element.type === 'double-arrow' || element.type === 'curved-arrow' || element.type === 'elbow-connector' || element.type === 'dashed-arrow') {
    if (!element.points || element.points.length === 0) {
      const minX = Math.min(element.x, element.x + element.width);
      const minY = Math.min(element.y, element.y + element.height);
      const maxX = Math.max(element.x, element.x + element.width);
      const maxY = Math.max(element.y, element.y + element.height);
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(maxX - minX, 10),
        height: Math.max(maxY - minY, 10),
      };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of element.points) {
      const px = element.x + pt.x;
      const py = element.y + pt.y;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }

    const pad = Math.max((element.strokeWidth || 2) * 2, 8);
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(maxX - minX + pad * 2, 12),
      height: Math.max(maxY - minY + pad * 2, 12),
    };
  }

  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const maxX = Math.max(element.x, element.x + element.width);
  const maxY = Math.max(element.y, element.y + element.height);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(maxX - minX, 10),
    height: Math.max(maxY - minY, 10),
  };
}

export function getCombinedBounds(elements: WhiteboardElement[]): BoundingBox | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function isPointInsideElement(
  x: number,
  y: number,
  element: WhiteboardElement,
  threshold: number = 10
): boolean {
  const bounds = getElementBounds(element);

  // Quick bounding box check with threshold
  if (
    x < bounds.minX - threshold ||
    x > bounds.maxX + threshold ||
    y < bounds.minY - threshold ||
    y > bounds.maxY + threshold
  ) {
    return false;
  }

  if (element.type === 'draw' && element.points && element.points.length > 0) {
    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = element.points[i];
      const p2 = element.points[i + 1];
      const dist = distanceToSegment(
        x,
        y,
        element.x + p1.x,
        element.y + p1.y,
        element.x + p2.x,
        element.y + p2.y
      );
      if (dist <= threshold + (element.strokeWidth || 2)) return true;
    }
    return false;
  }

  if ((element.type === 'line' || element.type === 'arrow' || element.type === 'double-arrow' || element.type === 'curved-arrow' || element.type === 'elbow-connector' || element.type === 'dashed-arrow') && element.points && element.points.length > 0) {
    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = element.points[i];
      const p2 = element.points[i + 1];
      const dist = distanceToSegment(
        x,
        y,
        element.x + p1.x,
        element.y + p1.y,
        element.x + p2.x,
        element.y + p2.y
      );
      if (dist <= threshold + (element.strokeWidth || 2)) return true;
    }
    return false;
  }

  // Rectangles, images, and text are draggable from anywhere within their bounds
  if (element.type === 'rectangle' || element.type === 'image' || element.type === 'text') {
    return (
      x >= bounds.minX - threshold &&
      x <= bounds.maxX + threshold &&
      y >= bounds.minY - threshold &&
      y <= bounds.maxY + threshold
    );
  }

  if (element.type === 'diamond') {
    const cx = bounds.minX + bounds.width / 2;
    const cy = bounds.minY + bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    if (rx === 0 || ry === 0) return false;
    const normDist = Math.abs(x - cx) / rx + Math.abs(y - cy) / ry;
    return normDist <= 1.25;
  }

  if (element.type === 'ellipse') {
    const cx = bounds.minX + bounds.width / 2;
    const cy = bounds.minY + bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    if (rx === 0 || ry === 0) return false;
    const normDist = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
    return normDist <= 1.3;
  }

  return true;
}

export function getResizeHandles(bounds: BoundingBox, zoom: number): Record<ResizeHandle, Point> {
  const halfHandle = (HANDLE_SIZE / 2) / zoom;
  const rotOffset = ROTATION_HANDLE_OFFSET / zoom;

  return {
    nw: { x: bounds.minX - halfHandle, y: bounds.minY - halfHandle },
    n:  { x: bounds.minX + bounds.width / 2, y: bounds.minY - halfHandle },
    ne: { x: bounds.maxX + halfHandle, y: bounds.minY - halfHandle },
    e:  { x: bounds.maxX + halfHandle, y: bounds.minY + bounds.height / 2 },
    se: { x: bounds.maxX + halfHandle, y: bounds.maxY + halfHandle },
    s:  { x: bounds.minX + bounds.width / 2, y: bounds.maxY + halfHandle },
    sw: { x: bounds.minX - halfHandle, y: bounds.maxY + halfHandle },
    w:  { x: bounds.minX - halfHandle, y: bounds.minY + bounds.height / 2 },
    rotation: { x: bounds.minX + bounds.width / 2, y: bounds.minY - rotOffset },
  };
}

export function getHitHandle(
  worldX: number,
  worldY: number,
  bounds: BoundingBox,
  zoom: number
): ResizeHandle | null {
  const handles = getResizeHandles(bounds, zoom);
  const hitRadius = (HANDLE_SIZE * 1.5) / zoom;

  for (const [handleKey, point] of Object.entries(handles) as [ResizeHandle, Point][]) {
    if (Math.hypot(worldX - point.x, worldY - point.y) <= hitRadius) {
      return handleKey;
    }
  }

  return null;
}

export function isElementIntersectingBox(
  element: WhiteboardElement,
  box: { startX: number; startY: number; endX: number; endY: number }
): boolean {
  const minX = Math.min(box.startX, box.endX);
  const maxX = Math.max(box.startX, box.endX);
  const minY = Math.min(box.startY, box.endY);
  const maxY = Math.max(box.startY, box.endY);

  const b = getElementBounds(element);
  return !(b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY);
}

// Ray-casting point in polygon algorithm
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let isInside = false;
  const n = polygon.length;
  if (n < 3) return false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }

  return isInside;
}

// Check if element is enclosed or intersects a lasso polygon
export function isElementInsideLasso(element: WhiteboardElement, lassoPoints: Point[]): boolean {
  if (lassoPoints.length < 3) return false;
  const bounds = getElementBounds(element);

  // Check center
  const center: Point = {
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2,
  };
  if (pointInPolygon(center, lassoPoints)) return true;

  // Check element points for draw/line/arrow
  if (element.points && element.points.length > 0) {
    for (const pt of element.points) {
      if (pointInPolygon({ x: element.x + pt.x, y: element.y + pt.y }, lassoPoints)) {
        return true;
      }
    }
  }

  // Check 4 corners
  const corners: Point[] = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];

  for (const corner of corners) {
    if (pointInPolygon(corner, lassoPoints)) return true;
  }

  // Check if any lasso point is inside the element
  for (const lp of lassoPoints) {
    if (isPointInsideElement(lp.x, lp.y, element)) return true;
  }

  return false;
}

/**
 * Accurately measures the width and height of multiline text.
 * Uses a hidden canvas context.
 */
export function measureTextDimensions(
  text: string,
  fontSize: number,
  fontFamily: string
): { width: number; height: number } {
  if (!text) return { width: 0, height: 0 };
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 0, height: 0 };

  ctx.font = `${fontSize}px "${fontFamily}", cursive, sans-serif`;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  // Use a slight padding so the caret fits and bounds aren't too tight
  const lineHeight = fontSize * 1.35;
  const height = lines.length * lineHeight;
  
  return {
    width: maxWidth + 8, // slight padding for caret/italic slant
    height: height
  };
}

// Catmull-Rom / Bézier smoothing for lasso points
export function getSmoothLassoPath(points: Point[]): Path2D {
  const path = new Path2D();
  if (points.length < 2) return path;

  path.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    path.lineTo(points[1].x, points[1].y);
    return path;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  path.closePath();
  return path;
}
