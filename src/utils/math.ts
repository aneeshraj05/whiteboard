import { Point, WhiteboardElement, ResizeHandle, ToolType, AnchorPosition } from '../types/whiteboard';

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

export function isConnectorType(type: ToolType): boolean {
  return (
    type === 'line' ||
    type === 'arrow' ||
    type === 'double-arrow' ||
    type === 'curved-arrow' ||
    type === 'elbow-connector' ||
    type === 'dashed-arrow'
  );
}

export function rotatePoint(p: Point, center: Point, angle: number): Point {
  if (!angle) return { x: p.x, y: p.y };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function unrotatePoint(p: Point, center: Point, angle: number): Point {
  return rotatePoint(p, center, -angle);
}

export function getElementCenter(element: WhiteboardElement): Point {
  if (isConnectorType(element.type)) {
    return {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
    };
  }
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const w = Math.abs(element.width);
  const h = Math.abs(element.height);
  return {
    x: minX + w / 2,
    y: minY + h / 2,
  };
}

export function getElementBounds(element: WhiteboardElement, accountForRotation = false): BoundingBox {
  if (element.type === 'draw' || isConnectorType(element.type)) {
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
  const w = Math.max(maxX - minX, 10);
  const h = Math.max(maxY - minY, 10);

  if (accountForRotation && element.angle) {
    const center = { x: minX + w / 2, y: minY + h / 2 };
    const corners = [
      rotatePoint({ x: minX, y: minY }, center, element.angle),
      rotatePoint({ x: maxX, y: minY }, center, element.angle),
      rotatePoint({ x: maxX, y: maxY }, center, element.angle),
      rotatePoint({ x: minX, y: maxY }, center, element.angle),
    ];
    let rMinX = Infinity;
    let rMinY = Infinity;
    let rMaxX = -Infinity;
    let rMaxY = -Infinity;
    for (const c of corners) {
      rMinX = Math.min(rMinX, c.x);
      rMinY = Math.min(rMinY, c.y);
      rMaxX = Math.max(rMaxX, c.x);
      rMaxY = Math.max(rMaxY, c.y);
    }
    return {
      minX: rMinX,
      minY: rMinY,
      maxX: rMaxX,
      maxY: rMaxY,
      width: rMaxX - rMinX,
      height: rMaxY - rMinY,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: w,
    height: h,
  };
}

export function getCombinedBounds(elements: WhiteboardElement[]): BoundingBox | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el, true);
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
  rawX: number,
  rawY: number,
  element: WhiteboardElement,
  threshold: number = 10
): boolean {
  let x = rawX;
  let y = rawY;

  // Unrotate point if element has an angle
  if (element.angle && !isConnectorType(element.type)) {
    const center = getElementCenter(element);
    const unrot = unrotatePoint({ x: rawX, y: rawY }, center, element.angle);
    x = unrot.x;
    y = unrot.y;
  }

  const bounds = getElementBounds(element, false);

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

  if (isConnectorType(element.type)) {
    if (element.points && element.points.length > 0) {
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
    const dist = distanceToSegment(
      x,
      y,
      element.x,
      element.y,
      element.x + element.width,
      element.y + element.height
    );
    return dist <= threshold + (element.strokeWidth || 2);
  }

  // Rectangles, images, and text are draggable from anywhere within their bounds
  if (element.type === 'rectangle' || element.type === 'rounded-rectangle' || element.type === 'image' || element.type === 'text') {
    return (
      x >= bounds.minX - threshold &&
      x <= bounds.maxX + threshold &&
      y >= bounds.minY - threshold &&
      y <= bounds.maxY + threshold
    );
  }

  if (element.type === 'diamond' || element.type === 'decision') {
    const cx = bounds.minX + bounds.width / 2;
    const cy = bounds.minY + bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    if (rx === 0 || ry === 0) return false;
    const normDist = Math.abs(x - cx) / rx + Math.abs(y - cy) / ry;
    return normDist <= 1.25;
  }

  if (element.type === 'ellipse' || element.type === 'terminator') {
    const cx = bounds.minX + bounds.width / 2;
    const cy = bounds.minY + bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    if (rx === 0 || ry === 0) return false;
    const normDist = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
    return normDist <= 1.3;
  }

  return (
    x >= bounds.minX - threshold &&
    x <= bounds.maxX + threshold &&
    y >= bounds.minY - threshold &&
    y <= bounds.maxY + threshold
  );
}

// ─── SHAPE ANCHORS & CONNECTORS ───────────────────────────────────────────────

export function getShapeAnchorPoint(element: WhiteboardElement, anchor: AnchorPosition): Point {
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const w = Math.abs(element.width);
  const h = Math.abs(element.height);
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  let rawPt: Point;
  switch (anchor) {
    case 'top':
      rawPt = { x: cx, y: minY };
      break;
    case 'right':
      rawPt = { x: minX + w, y: cy };
      break;
    case 'bottom':
      rawPt = { x: cx, y: minY + h };
      break;
    case 'left':
      rawPt = { x: minX, y: cy };
      break;
  }

  if (element.angle) {
    return rotatePoint(rawPt, { x: cx, y: cy }, element.angle);
  }
  return rawPt;
}

export function getShapeAnchorPoints(element: WhiteboardElement): { anchor: AnchorPosition; point: Point }[] {
  if (isConnectorType(element.type) || element.type === 'draw') return [];
  const positions: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];
  return positions.map((anchor) => ({
    anchor,
    point: getShapeAnchorPoint(element, anchor),
  }));
}

export function getNearestAnchor(
  worldPt: Point,
  elements: WhiteboardElement[],
  excludeId?: string,
  threshold: number = 24
): { elementId: string; anchor: AnchorPosition; point: Point } | null {
  let nearest: { elementId: string; anchor: AnchorPosition; point: Point } | null = null;
  let minDistance = threshold;

  for (const el of elements) {
    if (el.id === excludeId || isConnectorType(el.type) || el.type === 'draw') continue;
    const anchors = getShapeAnchorPoints(el);
    for (const a of anchors) {
      const dist = Math.hypot(worldPt.x - a.point.x, worldPt.y - a.point.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = { elementId: el.id, anchor: a.anchor, point: a.point };
      }
    }
  }

  return nearest;
}

export function syncBoundConnectors(
  elements: WhiteboardElement[],
  changedIds?: string[]
): WhiteboardElement[] {
  const elementMap = new Map(elements.map((el) => [el.id, el]));
  let hasUpdates = false;

  const next = elements.map((el) => {
    if (!isConnectorType(el.type)) return el;
    if (!el.startBinding && !el.endBinding) return el;

    let startX = el.x;
    let startY = el.y;
    let endX = el.x + el.width;
    let endY = el.y + el.height;

    let changed = false;

    if (el.startBinding) {
      const boundShape = elementMap.get(el.startBinding.elementId);
      if (boundShape) {
        const anchorPt = getShapeAnchorPoint(boundShape, el.startBinding.anchor);
        if (Math.abs(startX - anchorPt.x) > 0.01 || Math.abs(startY - anchorPt.y) > 0.01) {
          startX = anchorPt.x;
          startY = anchorPt.y;
          changed = true;
        }
      }
    }

    if (el.endBinding) {
      const boundShape = elementMap.get(el.endBinding.elementId);
      if (boundShape) {
        const anchorPt = getShapeAnchorPoint(boundShape, el.endBinding.anchor);
        if (Math.abs(endX - anchorPt.x) > 0.01 || Math.abs(endY - anchorPt.y) > 0.01) {
          endX = anchorPt.x;
          endY = anchorPt.y;
          changed = true;
        }
      }
    }

    if (!changed) return el;
    hasUpdates = true;

    const newW = endX - startX;
    const newH = endY - startY;

    return {
      ...el,
      x: startX,
      y: startY,
      width: newW,
      height: newH,
      points: [
        { x: 0, y: 0 },
        { x: newW, y: newH },
      ],
      updatedAt: Date.now(),
    };
  });

  return hasUpdates ? next : elements;
}

// ─── RESIZE & ROTATION HANDLES ────────────────────────────────────────────────

export function getResizeHandles(
  bounds: BoundingBox,
  zoom: number,
  angle: number = 0,
  center?: Point
): Record<ResizeHandle, Point> {
  const halfHandle = HANDLE_SIZE / 2 / zoom;
  const rotOffset = ROTATION_HANDLE_OFFSET / zoom;

  const rawHandles: Record<ResizeHandle, Point> = {
    nw: { x: bounds.minX - halfHandle, y: bounds.minY - halfHandle },
    n: { x: bounds.minX + bounds.width / 2, y: bounds.minY - halfHandle },
    ne: { x: bounds.maxX + halfHandle, y: bounds.minY - halfHandle },
    e: { x: bounds.maxX + halfHandle, y: bounds.minY + bounds.height / 2 },
    se: { x: bounds.maxX + halfHandle, y: bounds.maxY + halfHandle },
    s: { x: bounds.minX + bounds.width / 2, y: bounds.maxY + halfHandle },
    sw: { x: bounds.minX - halfHandle, y: bounds.maxY + halfHandle },
    w: { x: bounds.minX - halfHandle, y: bounds.minY + bounds.height / 2 },
    rotation: { x: bounds.minX + bounds.width / 2, y: bounds.minY - rotOffset },
    'endpoint-start': { x: bounds.minX, y: bounds.minY },
    'endpoint-end': { x: bounds.maxX, y: bounds.maxY },
  };

  if (!angle || !center) return rawHandles;

  const rotatedHandles: Partial<Record<ResizeHandle, Point>> = {};
  for (const [key, pt] of Object.entries(rawHandles)) {
    rotatedHandles[key as ResizeHandle] = rotatePoint(pt, center, angle);
  }
  return rotatedHandles as Record<ResizeHandle, Point>;
}

export function getHitHandle(
  worldX: number,
  worldY: number,
  bounds: BoundingBox,
  zoom: number,
  angle: number = 0,
  center?: Point,
  connectorElement?: WhiteboardElement
): ResizeHandle | null {
  const hitRadius = (HANDLE_SIZE * 1.6) / zoom;

  // If connector is selected, check its direct endpoints
  if (connectorElement && isConnectorType(connectorElement.type)) {
    const startPt: Point = { x: connectorElement.x, y: connectorElement.y };
    const endPt: Point = { x: connectorElement.x + connectorElement.width, y: connectorElement.y + connectorElement.height };

    if (Math.hypot(worldX - startPt.x, worldY - startPt.y) <= hitRadius) {
      return 'endpoint-start';
    }
    if (Math.hypot(worldX - endPt.x, worldY - endPt.y) <= hitRadius) {
      return 'endpoint-end';
    }
  }

  const handles = getResizeHandles(bounds, zoom, angle, center);

  // Check rotation handle first for responsiveness
  if (Math.hypot(worldX - handles.rotation.x, worldY - handles.rotation.y) <= hitRadius * 1.3) {
    return 'rotation';
  }

  const resizeKeys: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  for (const handleKey of resizeKeys) {
    const pt = handles[handleKey];
    if (Math.hypot(worldX - pt.x, worldY - pt.y) <= hitRadius) {
      return handleKey;
    }
  }

  return null;
}

// ─── MULTI-ELEMENT TRANSFORM HELPERS ──────────────────────────────────────────

export function scaleElementsInBounds(
  initialElements: WhiteboardElement[],
  initialBounds: BoundingBox,
  newBounds: BoundingBox
): WhiteboardElement[] {
  if (initialBounds.width === 0 || initialBounds.height === 0) return initialElements;

  const scaleX = newBounds.width / initialBounds.width;
  const scaleY = newBounds.height / initialBounds.height;

  return initialElements.map((el) => {
    if (el.isLocked) return el;

    const relX = (el.x - initialBounds.minX) / initialBounds.width;
    const relY = (el.y - initialBounds.minY) / initialBounds.height;
    const relW = el.width / initialBounds.width;
    const relH = el.height / initialBounds.height;

    const nextX = newBounds.minX + relX * newBounds.width;
    const nextY = newBounds.minY + relY * newBounds.height;
    const nextW = relW * newBounds.width;
    const nextH = relH * newBounds.height;

    let scaledPoints = el.points;
    if (el.points && el.points.length > 0) {
      scaledPoints = el.points.map((p) => ({
        x: p.x * scaleX,
        y: p.y * scaleY,
        pressure: p.pressure,
      }));
    }

    let nextFontSize = el.fontSize;
    if (el.type === 'text' && el.fontSize) {
      const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
      nextFontSize = Math.max(8, el.fontSize * avgScale);
    }

    return {
      ...el,
      x: nextX,
      y: nextY,
      width: nextW,
      height: nextH,
      points: scaledPoints,
      fontSize: nextFontSize,
      updatedAt: Date.now(),
    };
  });
}

export function rotateElementsAroundCenter(
  initialElements: WhiteboardElement[],
  groupCenter: Point,
  deltaAngle: number
): WhiteboardElement[] {
  return initialElements.map((el) => {
    if (el.isLocked) return el;

    const elCenter = getElementCenter(el);
    const rotatedElCenter = rotatePoint(elCenter, groupCenter, deltaAngle);

    const minX = Math.min(el.x, el.x + el.width);
    const minY = Math.min(el.y, el.y + el.height);
    const w = Math.abs(el.width);
    const h = Math.abs(el.height);

    const nextX = rotatedElCenter.x - w / 2;
    const nextY = rotatedElCenter.y - h / 2;
    const nextAngle = (el.angle || 0) + deltaAngle;

    return {
      ...el,
      x: el.width >= 0 ? nextX : nextX + w,
      y: el.height >= 0 ? nextY : nextY + h,
      angle: nextAngle,
      updatedAt: Date.now(),
    };
  });
}

export function isElementIntersectingBox(
  element: WhiteboardElement,
  box: { startX: number; startY: number; endX: number; endY: number }
): boolean {
  const minX = Math.min(box.startX, box.endX);
  const maxX = Math.max(box.startX, box.endX);
  const minY = Math.min(box.startY, box.endY);
  const maxY = Math.max(box.startY, box.endY);

  const b = getElementBounds(element, true);
  return !(b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY);
}

// Ray-casting point in polygon algorithm
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let isInside = false;
  const n = polygon.length;
  if (n < 3) return false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }

  return isInside;
}

// Check if element is enclosed or intersects a lasso polygon
export function isElementInsideLasso(element: WhiteboardElement, lassoPoints: Point[]): boolean {
  if (lassoPoints.length < 3) return false;
  const bounds = getElementBounds(element, true);

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
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): { width: number; height: number } {
  if (!text) return { width: 0, height: 0 };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 0, height: 0 };

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", cursive, sans-serif`;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  const lineHeight = fontSize * 1.35;
  const height = lines.length * lineHeight;

  return {
    width: maxWidth + 8,
    height: height,
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
