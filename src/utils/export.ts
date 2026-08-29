import rough from 'roughjs';
import { WhiteboardElement } from '../types/whiteboard';
import { getCombinedBounds, BoundingBox } from './math';
import { renderElement } from './roughRenderer';

export function exportToJson(elements: WhiteboardElement[], appState?: any) {
  const data = {
    type: 'whiteboard_document',
    version: 1,
    source: 'whiteboard-editor',
    elements,
    appState: {
      viewBackgroundColor: appState?.canvasBackground || '#ffffff',
      gridSize: 20,
    },
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPng(
  elements: WhiteboardElement[],
  options: {
    backgroundColor?: string;
    padding?: number;
    scale?: number;
    theme?: 'light' | 'dark';
  } = {}
) {
  if (elements.length === 0) return;

  const bounds = getCombinedBounds(elements);
  if (!bounds) return;

  const padding = options.padding ?? 40;
  const scale = options.scale ?? 2; // 2x high-res
  const bg = options.backgroundColor || (options.theme === 'dark' ? '#121212' : '#ffffff');

  const width = (bounds.width + padding * 2) * scale;
  const height = (bounds.height + padding * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.scale(scale, scale);
  ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

  const rc = rough.canvas(canvas);

  for (const el of elements) {
    renderElement(rc, ctx, el);
  }

  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
  a.click();
}

export async function copyPngToClipboard(
  elements: WhiteboardElement[],
  options: {
    backgroundColor?: string;
    padding?: number;
    scale?: number;
    theme?: 'light' | 'dark';
  } = {}
): Promise<boolean> {
  try {
    if (elements.length === 0) return false;
    const bounds = getCombinedBounds(elements);
    if (!bounds) return false;

    const padding = options.padding ?? 40;
    const scale = options.scale ?? 2;
    const bg = options.backgroundColor || (options.theme === 'dark' ? '#121212' : '#ffffff');

    const width = (bounds.width + padding * 2) * scale;
    const height = (bounds.height + padding * 2) * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    if (bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.scale(scale, scale);
    ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

    const rc = rough.canvas(canvas);
    for (const el of elements) {
      renderElement(rc, ctx, el);
    }

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(false);
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Clipboard copy error', err);
    return false;
  }
}
