import rough from 'roughjs';
import { getStroke } from 'perfect-freehand';
import { WhiteboardElement, ResizeHandle, LaserPoint, Point, BackgroundPattern } from '../types/whiteboard';
import { BoundingBox, getElementBounds, getResizeHandles, HANDLE_SIZE, getSmoothLassoPath } from './math';

// Cache loaded image elements
const imageCache: Map<string, HTMLImageElement> = new Map();

function getOrCreateImage(url: string, onLoaded?: () => void): HTMLImageElement | null {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  const img = new Image();
  img.src = url;
  img.onload = () => {
    imageCache.set(url, img);
    if (onLoaded) onLoaded();
  };
  return null;
}

function getRoughOptions(element: WhiteboardElement) {
  const options: any = {
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    roughness: element.roughness === 0 ? 0.1 : element.roughness === 1 ? 1.2 : 2.4,
    bowing: element.roughness === 0 ? 0 : 1.5,
    seed: (element.createdAt || 12345) % 100000,
  };

  if (element.strokeStyle === 'dashed') {
    options.strokeLineDash = [8, 8];
  } else if (element.strokeStyle === 'dotted') {
    options.strokeLineDash = [3, 5];
  }

  if (element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle !== 'none') {
    options.fill = element.backgroundColor;
    options.fillStyle = element.fillStyle;
    if (element.fillStyle === 'hachure') {
      options.hachureAngle = 60;
      options.hachureGap = 4;
    } else if (element.fillStyle === 'cross-hatch') {
      options.hachureAngle = 45;
      options.hachureGap = 5;
    } else if (element.fillStyle === 'zigzag') {
      options.hachureAngle = -45;
      options.hachureGap = 4;
    }
  }

  return options;
}

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

export function drawArrowHead(
  rc: any,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  options: any
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = Math.max(16, (options.strokeWidth || 2) * 6);
  const angleOffset = Math.PI / 6; // 30 degrees

  const x1 = toX - headLen * Math.cos(angle - angleOffset);
  const y1 = toY - headLen * Math.sin(angle - angleOffset);
  const x2 = toX - headLen * Math.cos(angle + angleOffset);
  const y2 = toY - headLen * Math.sin(angle + angleOffset);

  rc.linearPath(
    [
      [x1, y1],
      [toX, toY],
      [x2, y2],
    ],
    options
  );
}

export function renderElement(
  rc: any,
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  onImageLoaded?: () => void
) {
  ctx.save();
  ctx.globalAlpha = (element.opacity ?? 100) / 100;

  const options = getRoughOptions(element);

  // Normalized bounding box helpers
  const ex = Math.min(element.x, element.x + element.width);
  const ey = Math.min(element.y, element.y + element.height);
  const ew = Math.abs(element.width);
  const eh = Math.abs(element.height);

  // Prevent RoughJS from crashing on zero-area shapes during initial click
  if (ew === 0 && eh === 0 && element.type !== 'draw' && element.type !== 'text') {
    ctx.restore();
    return;
  }

  const ecx = ex + ew / 2;
  const ecy = ey + eh / 2;

  function regularPolygon(n: number, offsetAngle = 0): [number, number][] {
    const rx = ew / 2;
    const ry = eh / 2;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = offsetAngle + (2 * Math.PI * i) / n - Math.PI / 2;
      pts.push([ecx + rx * Math.cos(a), ecy + ry * Math.sin(a)]);
    }
    return pts;
  }

  function starPolygon(points: number, outerRx: number, outerRy: number, innerRx: number, innerRy: number): [number, number][] {
    const pts: [number, number][] = [];
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI * i) / points - Math.PI / 2;
      const rx = i % 2 === 0 ? outerRx : innerRx;
      const ry = i % 2 === 0 ? outerRy : innerRy;
      pts.push([ecx + rx * Math.cos(a), ecy + ry * Math.sin(a)]);
    }
    return pts;
  }

  function drawInlineText() {
    if (!element.text) return;
    const fontSize = element.fontSize || 16;
    const fontFamily = element.fontFamily || 'Inter';
    ctx.save();
    ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = element.strokeColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const lines = element.text.split('\n');
    const lineHeight = fontSize * 1.3;
    const totalH = lines.length * lineHeight;
    lines.forEach((line, idx) => {
      const ty = ecy - totalH / 2 + lineHeight * (idx + 0.5);
      ctx.fillText(line, ecx, ty);
    });
    ctx.restore();
  }

  switch (element.type) {
    case 'rectangle': {
      if (element.roundness) {
        const r = Math.min(ew, eh) * 0.15;
        const path = `M ${ex + r} ${ey} H ${ex + ew - r} Q ${ex + ew} ${ey} ${ex + ew} ${ey + r} V ${ey + eh - r} Q ${ex + ew} ${ey + eh} ${ex + ew - r} ${ey + eh} H ${ex + r} Q ${ex} ${ey + eh} ${ex} ${ey + eh - r} V ${ey + r} Q ${ex} ${ey} ${ex + r} ${ey} Z`;
        rc.path(path, options);
      } else {
        rc.rectangle(element.x, element.y, element.width, element.height, options);
      }
      drawInlineText();
      break;
    }

    case 'diamond': {
      rc.polygon([[ecx, ey], [ex + ew, ecy], [ecx, ey + eh], [ex, ecy]], options);
      drawInlineText();
      break;
    }

    case 'ellipse': {
      rc.ellipse(ecx, ecy, ew, eh, options);
      drawInlineText();
      break;
    }

    case 'line': {
      if (element.points && element.points.length >= 2) {
        const pts = element.points.map((p) => [element.x + p.x, element.y + p.y]);
        rc.linearPath(pts, options);
      } else {
        rc.line(element.x, element.y, element.x + element.width, element.y + element.height, options);
      }
      break;
    }

    case 'arrow': {
      if (element.points && element.points.length >= 2) {
        const pts = element.points.map((p) => [element.x + p.x, element.y + p.y]);
        rc.linearPath(pts, options);
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        drawArrowHead(rc, prev[0], prev[1], last[0], last[1], options);
      } else {
        const toX = element.x + element.width;
        const toY = element.y + element.height;
        rc.line(element.x, element.y, toX, toY, options);
        drawArrowHead(rc, element.x, element.y, toX, toY, options);
      }
      break;
    }

    case 'draw': {
      if (!element.points || element.points.length === 0) break;
      const strokePoints = element.points.map((p) => [element.x + p.x, element.y + p.y, p.pressure || 0.5]);
      const stroke = getStroke(strokePoints as any, {
        size: (element.strokeWidth || 2) * 2.5,
        thinning: 0.5,
        smoothing: 0.6,
        streamline: 0.5,
      });
      const pathData = getSvgPathFromStroke(stroke);
      const path2d = new Path2D(pathData);
      ctx.fillStyle = element.strokeColor;
      ctx.fill(path2d);
      break;
    }

    case 'text': {
      if (!element.text) break;
      ctx.setLineDash([]); // Ensure no dashed state leaks into text rendering
      const fontSize = element.fontSize || 20;
      const fontFamily = element.fontFamily || 'Kalam';
      ctx.font = `${fontSize}px "${fontFamily}", cursive, sans-serif`;
      ctx.fillStyle = element.strokeColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = element.textAlign || 'left';
      const lines = element.text.split('\n');
      const lineHeight = fontSize * 1.35;
      lines.forEach((line, idx) => {
        let textX = element.x;
        if (element.textAlign === 'center') textX = element.x + element.width / 2;
        if (element.textAlign === 'right') textX = element.x + element.width;
        ctx.fillText(line, textX, element.y + idx * lineHeight);
      });
      break;
    }

    case 'image': {
      if (!element.imageDataUrl) break;
      const img = getOrCreateImage(element.imageDataUrl, onImageLoaded);
      if (img && img.complete) {
        ctx.drawImage(img, element.x, element.y, element.width, element.height);
      } else {
        rc.rectangle(element.x, element.y, element.width, element.height, {
          ...options, stroke: '#868e96', strokeLineDash: [4, 4],
        });
      }
      break;
    }

    // Basic shapes
    case 'rounded-rectangle': {
      const r = Math.min(ew, eh) * 0.2;
      const path = `M ${ex + r} ${ey} H ${ex + ew - r} Q ${ex + ew} ${ey} ${ex + ew} ${ey + r} V ${ey + eh - r} Q ${ex + ew} ${ey + eh} ${ex + ew - r} ${ey + eh} H ${ex + r} Q ${ex} ${ey + eh} ${ex} ${ey + eh - r} V ${ey + r} Q ${ex} ${ey} ${ex + r} ${ey} Z`;
      rc.path(path, options);
      drawInlineText();
      break;
    }

    case 'triangle': {
      rc.polygon([[ecx, ey], [ex + ew, ey + eh], [ex, ey + eh]], options);
      drawInlineText();
      break;
    }

    case 'right-triangle': {
      rc.polygon([[ex, ey], [ex + ew, ey + eh], [ex, ey + eh]], options);
      drawInlineText();
      break;
    }

    case 'pentagon': {
      rc.polygon(regularPolygon(5), options);
      drawInlineText();
      break;
    }

    case 'hexagon': {
      rc.polygon(regularPolygon(6, Math.PI / 6), options);
      drawInlineText();
      break;
    }

    case 'octagon': {
      rc.polygon(regularPolygon(8, Math.PI / 8), options);
      drawInlineText();
      break;
    }

    case 'star': {
      const pts = starPolygon(5, ew / 2, eh / 2, ew / 4.5, eh / 4.5);
      rc.polygon(pts, options);
      drawInlineText();
      break;
    }

    case 'burst': {
      const pts = starPolygon(12, ew / 2, eh / 2, ew / 3, eh / 3);
      rc.polygon(pts, options);
      drawInlineText();
      break;
    }

    // Connector shapes
    case 'double-arrow': {
      const toX = element.x + element.width;
      const toY = element.y + element.height;
      rc.line(element.x, element.y, toX, toY, options);
      drawArrowHead(rc, element.x, element.y, toX, toY, options);
      drawArrowHead(rc, toX, toY, element.x, element.y, options);
      break;
    }

    case 'curved-arrow': {
      const toX = element.x + element.width;
      const toY = element.y + element.height;
      const cpX = element.x + element.width * 0.1;
      const cpY = element.y + element.height * 0.9;
      rc.path(`M ${element.x} ${element.y} Q ${cpX} ${cpY} ${toX} ${toY}`, options);
      drawArrowHead(rc, cpX, cpY, toX, toY, options);
      break;
    }

    case 'elbow-connector': {
      const toX = element.x + element.width;
      const toY = element.y + element.height;
      rc.linearPath([[element.x, element.y], [toX, element.y], [toX, toY]], options);
      drawArrowHead(rc, toX, element.y, toX, toY, options);
      break;
    }

    case 'dashed-arrow': {
      const dashedOpts = { ...options, strokeLineDash: [8, 6] };
      const toX = element.x + element.width;
      const toY = element.y + element.height;
      rc.line(element.x, element.y, toX, toY, dashedOpts);
      drawArrowHead(rc, element.x, element.y, toX, toY, options);
      break;
    }

    // Flowchart shapes
    case 'process': {
      rc.rectangle(ex, ey, ew, eh, options);
      drawInlineText();
      break;
    }

    case 'decision': {
      rc.polygon([[ecx, ey], [ex + ew, ecy], [ecx, ey + eh], [ex, ecy]], options);
      drawInlineText();
      break;
    }

    case 'input-output': {
      const skew = ew * 0.15;
      rc.polygon([[ex + skew, ey], [ex + ew, ey], [ex + ew - skew, ey + eh], [ex, ey + eh]], options);
      drawInlineText();
      break;
    }

    case 'document': {
      const wavePath = `M ${ex} ${ey} H ${ex + ew} V ${ey + eh * 0.78} Q ${ecx + ew * 0.25} ${ey + eh * 1.05} ${ecx} ${ey + eh * 0.9} Q ${ecx - ew * 0.25} ${ey + eh * 0.75} ${ex} ${ey + eh * 0.78} Z`;
      rc.path(wavePath, options);
      drawInlineText();
      break;
    }

    case 'database': {
      const ellH = Math.min(eh * 0.25, 16);
      rc.ellipse(ecx, ey + ellH / 2, ew, ellH, options);
      rc.line(ex, ey + ellH / 2, ex, ey + eh - ellH / 2, options);
      rc.line(ex + ew, ey + ellH / 2, ex + ew, ey + eh - ellH / 2, options);
      rc.ellipse(ecx, ey + eh - ellH / 2, ew, ellH, options);
      drawInlineText();
      break;
    }

    case 'terminator': {
      const tr = Math.min(ew, eh) / 2;
      const path = `M ${ex + tr} ${ey} H ${ex + ew - tr} A ${tr} ${tr} 0 0 1 ${ex + ew - tr} ${ey + eh} H ${ex + tr} A ${tr} ${tr} 0 0 1 ${ex + tr} ${ey} Z`;
      rc.path(path, options);
      drawInlineText();
      break;
    }

    case 'predefined-process': {
      rc.rectangle(ex, ey, ew, eh, options);
      rc.line(ex + ew * 0.15, ey, ex + ew * 0.15, ey + eh, options);
      rc.line(ex + ew * 0.85, ey, ex + ew * 0.85, ey + eh, options);
      drawInlineText();
      break;
    }

    case 'manual-input': {
      const slopeH = eh * 0.25;
      rc.polygon([[ex, ey + slopeH], [ex + ew, ey], [ex + ew, ey + eh], [ex, ey + eh]], options);
      drawInlineText();
      break;
    }

    case 'delay': {
      const dr = Math.min(ew * 0.25, eh / 2);
      const path = `M ${ex} ${ey} H ${ex + ew - dr} A ${dr} ${eh / 2} 0 0 1 ${ex + ew - dr} ${ey + eh} H ${ex} Z`;
      rc.path(path, options);
      drawInlineText();
      break;
    }

    // Diagram shapes
    case 'cloud': {
      const p = `M ${ex + ew * 0.3} ${ey + eh * 0.7} A ${ew * 0.18} ${eh * 0.35} 0 0 1 ${ex + ew * 0.15} ${ey + eh * 0.4} A ${ew * 0.22} ${eh * 0.3} 0 0 1 ${ex + ew * 0.35} ${ey + eh * 0.15} A ${ew * 0.22} ${eh * 0.28} 0 0 1 ${ex + ew * 0.6} ${ey + eh * 0.12} A ${ew * 0.22} ${eh * 0.28} 0 0 1 ${ex + ew * 0.85} ${ey + eh * 0.35} A ${ew * 0.18} ${eh * 0.3} 0 0 1 ${ex + ew * 0.88} ${ey + eh * 0.65} Z`;
      rc.path(p, options);
      drawInlineText();
      break;
    }

    case 'cylinder': {
      const cylEllH = Math.min(eh * 0.2, 18);
      rc.ellipse(ecx, ey + cylEllH / 2, ew, cylEllH, options);
      rc.line(ex, ey + cylEllH / 2, ex, ey + eh - cylEllH / 2, options);
      rc.line(ex + ew, ey + cylEllH / 2, ex + ew, ey + eh - cylEllH / 2, options);
      const bottomPath = `M ${ex} ${ey + eh - cylEllH / 2} A ${ew / 2} ${cylEllH / 2} 0 0 0 ${ex + ew} ${ey + eh - cylEllH / 2}`;
      rc.path(bottomPath, options);
      drawInlineText();
      break;
    }

    case 'folder': {
      const tabW = ew * 0.4;
      const tabH = eh * 0.18;
      rc.polygon([[ex, ey + tabH], [ex + tabW, ey + tabH], [ex + tabW + tabH * 0.6, ey], [ex + ew, ey], [ex + ew, ey + eh], [ex, ey + eh]], options);
      drawInlineText();
      break;
    }

    case 'server': {
      const rows = 3;
      const rowH = eh / rows;
      for (let i = 0; i < rows; i++) {
        rc.rectangle(ex, ey + i * rowH, ew, rowH, options);
      }
      drawInlineText();
      break;
    }

    case 'person': {
      const headR = Math.min(ew * 0.22, eh * 0.22);
      const headCY = ey + headR * 1.2;
      rc.ellipse(ecx, headCY, headR * 2, headR * 2, options);
      const shoulderY = headCY + headR;
      const path = `M ${ex + ew * 0.1} ${ey + eh} Q ${ex + ew * 0.1} ${shoulderY + eh * 0.15} ${ecx} ${shoulderY + eh * 0.06} Q ${ex + ew * 0.9} ${shoulderY + eh * 0.15} ${ex + ew * 0.9} ${ey + eh}`;
      rc.path(path, options);
      break;
    }

    case 'message': {
      rc.rectangle(ex, ey, ew, eh, options);
      rc.linearPath([[ex, ey], [ecx, ecy], [ex + ew, ey]], options);
      drawInlineText();
      break;
    }

    case 'speech-bubble': {
      const bh = eh * 0.78;
      const tailW = ew * 0.12;
      const br = Math.min(ew, bh) * 0.15;
      const path = `M ${ex + br} ${ey} H ${ex + ew - br} Q ${ex + ew} ${ey} ${ex + ew} ${ey + br} V ${ey + bh - br} Q ${ex + ew} ${ey + bh} ${ex + ew - br} ${ey + bh} H ${ex + ew * 0.35} L ${ex + ew * 0.2} ${ey + eh} L ${ex + ew * 0.2 + tailW} ${ey + bh} H ${ex + br} Q ${ex} ${ey + bh} ${ex} ${ey + bh - br} V ${ey + br} Q ${ex} ${ey} ${ex + br} ${ey} Z`;
      rc.path(path, options);
      drawInlineText();
      break;
    }

    case 'callout': {
      const cbh = eh * 0.75;
      const cbr = Math.min(ew, cbh) * 0.12;
      const path = `M ${ex + cbr} ${ey} H ${ex + ew - cbr} Q ${ex + ew} ${ey} ${ex + ew} ${ey + cbr} V ${ey + cbh - cbr} Q ${ex + ew} ${ey + cbh} ${ex + ew - cbr} ${ey + cbh} H ${ecx + ew * 0.1} L ${ecx} ${ey + eh} L ${ecx - ew * 0.1} ${ey + cbh} H ${ex + cbr} Q ${ex} ${ey + cbh} ${ex} ${ey + cbh - cbr} V ${ey + cbr} Q ${ex} ${ey} ${ex + cbr} ${ey} Z`;
      rc.path(path, options);
      drawInlineText();
      break;
    }
  }

  ctx.restore();
}


export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  bounds: BoundingBox,
  zoom: number,
  isSingle: boolean = true
) {
  ctx.save();
  ctx.strokeStyle = '#5b5fc7';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 6 / zoom]);

  // Bounding outline
  ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
  ctx.setLineDash([]);

  // Draw 8 resize handles
  const handles = getResizeHandles(bounds, zoom);
  const handleSize = HANDLE_SIZE / zoom;
  const halfHandle = handleSize / 2;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#5b5fc7';
  ctx.lineWidth = 1.5 / zoom;

  const handleKeys: (ResizeHandle)[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  handleKeys.forEach((key) => {
    const pt = handles[key];
    ctx.beginPath();
    ctx.rect(pt.x - halfHandle, pt.y - halfHandle, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  });

  // Rotation handle (top tether)
  const rotPt = handles.rotation;
  const topCenter = handles.n;

  ctx.beginPath();
  ctx.moveTo(topCenter.x, topCenter.y);
  ctx.lineTo(rotPt.x, rotPt.y);
  ctx.strokeStyle = '#5b5fc7';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotPt.x, rotPt.y, halfHandle * 1.1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawMarqueeBox(
  ctx: CanvasRenderingContext2D,
  box: { startX: number; startY: number; endX: number; endY: number },
  zoom: number
) {
  const minX = Math.min(box.startX, box.endX);
  const maxX = Math.max(box.startX, box.endX);
  const minY = Math.min(box.startY, box.endY);
  const maxY = Math.max(box.startY, box.endY);
  const width = maxX - minX;
  const height = maxY - minY;

  ctx.save();
  ctx.fillStyle = 'rgba(91, 95, 199, 0.08)';
  ctx.fillRect(minX, minY, width, height);

  ctx.strokeStyle = '#5b5fc7';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(minX, minY, width, height);
  ctx.restore();
}

// Smooth Lasso Selection Contour
export function drawSmoothLasso(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  zoom: number
) {
  if (points.length < 2) return;

  ctx.save();
  const path = getSmoothLassoPath(points);

  ctx.fillStyle = 'rgba(91, 95, 199, 0.08)';
  ctx.fill(path);

  ctx.strokeStyle = '#5b5fc7';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.stroke(path);

  ctx.restore();
}

// Comprehensive Canvas Background Patterns (Blank, Dotted, Fine Dotted, Grid, Large Grid, Notebook, Graph Paper, Isometric)
export function drawCanvasPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
  pattern: BackgroundPattern,
  isDark: boolean
) {
  if (pattern === 'blank') return;

  ctx.save();
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const majorGridColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';
  const ruledLineColor = isDark ? 'rgba(105, 101, 219, 0.2)' : 'rgba(91, 95, 199, 0.15)';
  const marginLineColor = isDark ? 'rgba(235, 47, 150, 0.3)' : 'rgba(224, 49, 49, 0.25)';

  switch (pattern) {
    case 'dotted': {
      const step = 24 * zoom;
      const offsetX = scrollX % step;
      const offsetY = scrollY % step;
      ctx.fillStyle = dotColor;
      for (let x = offsetX; x < width; x += step) {
        for (let y = offsetY; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'fine-dotted': {
      const step = 14 * zoom;
      const offsetX = scrollX % step;
      const offsetY = scrollY % step;
      ctx.fillStyle = dotColor;
      for (let x = offsetX; x < width; x += step) {
        for (let y = offsetY; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'grid': {
      const step = 24 * zoom;
      const offsetX = scrollX % step;
      const offsetY = scrollY % step;
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'large-grid': {
      const step = 48 * zoom;
      const offsetX = scrollX % step;
      const offsetY = scrollY % step;
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'notebook': {
      const step = 28 * zoom;
      const offsetY = scrollY % step;
      // Ruled horizontal lines
      ctx.strokeStyle = ruledLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = offsetY; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Red/pink margin line
      const marginX = 80 * zoom + scrollX;
      if (marginX >= 0 && marginX <= width) {
        ctx.strokeStyle = marginLineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(marginX, 0);
        ctx.lineTo(marginX, height);
        ctx.stroke();
      }
      break;
    }

    case 'graph-paper': {
      const minorStep = 10 * zoom;
      const majorStep = 50 * zoom;
      const offMinX = scrollX % minorStep;
      const offMinY = scrollY % minorStep;
      const offMajX = scrollX % majorStep;
      const offMajY = scrollY % majorStep;

      // Minor lines
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let x = offMinX; x < width; x += minorStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offMinY; y < height; y += minorStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major lines
      ctx.strokeStyle = majorGridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = offMajX; x < width; x += majorStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offMajY; y < height; y += majorStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'isometric': {
      const step = 32 * zoom;
      const offsetX = scrollX % step;
      const offsetY = scrollY % (step * Math.sqrt(3));
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();

      // Vertical lines
      for (let x = offsetX; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      // Diagonal lines 60 deg
      const diagDist = step * 1.732;
      for (let y = -height; y < height * 2; y += diagDist) {
        ctx.moveTo(0, y + offsetY);
        ctx.lineTo(width, y + offsetY + width * 0.577);
        ctx.moveTo(0, y + offsetY);
        ctx.lineTo(width, y + offsetY - width * 0.577);
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export function drawLaserTrail(
  ctx: CanvasRenderingContext2D,
  trail: LaserPoint[],
  zoom: number
) {
  if (trail.length < 2) return;
  const now = Date.now();
  const maxAge = 800; // ms

  // Filter to only visible points
  const visible = trail.filter((p) => now - p.time < maxAge);
  if (visible.length < 2) return;

  ctx.save();
  ctx.setLineDash([]); // Prevent laser pointer from rendering as dots/dashes
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw the trail as one smooth quadratic bezier path, segmented by opacity
  // We iterate pairs and draw mid-point quadratic curves for smooth appearance
  for (let i = 0; i < visible.length - 1; i++) {
    const p1 = visible[i];
    const p2 = visible[i + 1];
    const age = now - p2.time;
    const progress = Math.max(0, 1 - age / maxAge);
    if (progress <= 0) continue;

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mx, my);

    // Outer glow
    ctx.shadowColor = `rgba(235, 47, 150, ${progress * 0.6})`;
    ctx.shadowBlur = 8 / zoom;
    ctx.strokeStyle = `rgba(235, 47, 150, ${progress * 0.9})`;
    ctx.lineWidth = (5 * progress + 1) / zoom;
    ctx.stroke();
  }

  // Glowing head dot at the newest point
  const head = visible[visible.length - 1];
  const headAge = now - head.time;
  const headProgress = Math.max(0, 1 - headAge / maxAge);
  if (headProgress > 0) {
    ctx.beginPath();
    ctx.arc(head.x, head.y, 5 / zoom, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(235, 47, 150, 0.9)';
    ctx.shadowBlur = 12 / zoom;
    ctx.fillStyle = `rgba(255, 255, 255, ${headProgress})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(235, 47, 150, ${headProgress})`;
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();
  }

  ctx.restore();
}
