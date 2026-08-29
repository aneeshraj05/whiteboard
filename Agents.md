# Whiteboard Specification & Agent Guide

This document defines the architecture, user experience, visual design specifications, component breakdown, and feature requirements for the **Whiteboard Editor**.

---

## 1. Overview & Vision
A fast, lightweight, and delightful virtual whiteboard web application with a hand-drawn sketchy aesthetic and snappy UX. The application provides an infinite canvas, rich shape creation, freehand sketching, text, image insertion, layer management, undo/redo, real-time styling properties, and export to PNG and JSON.

---

## 2. Visual Design & Interface Architecture

### 2.1 Theme & Typography
- **Handwritten & Clean Fonts**:
  - Primary hand-drawn font: `Kalam`, `Architects Daughter`, and `Caveat`.
  - Secondary UI font: `Inter`, system sans-serif.
- **Color Palettes**:
  - Background: Clean white `#ffffff` or light cream `#fdfbf7`, dark mode `#121212`.
  - UI Accents: Indigo `#5b5fc7` / `#6965db` (Share button, active tool badge), Neutral Grays `#e2e8f0`, `#1e1e24`.
  - Canvas Stroke Palette: Pitch Black `#1e1e1e`, Crimson `#e03131`, Pink `#e64980`, Grape `#be4bdb`, Violet `#7950f2`, Indigo `#4c6ef5`, Blue `#228be6`, Cyan `#15aabf`, Teal `#12b886`, Green `#40c057`, Lime `#82c91e`, Yellow `#fab005`, Orange `#fd7e14`, Gray `#868e96`.
  - Background Fill Palette: Transparent, Light Pastel shades of the stroke palette.

### 2.2 Top Navigation & Floating Tool Palette
- **Top Left**: Menu button (`☰`) with slide-over drawer for file management (Open, Save, Export PNG, Canvas Background, Theme Toggle, Clear Canvas).
- **Top Center Floating Toolbar**:
  1. **Lock tool** (`Lock icon`): Toggle whether tool resets to Selection after drawing a shape.
  2. **Hand / Pan tool** (`H`): Click & drag to pan the viewport.
  3. **Selection tool** (`1`): Select, move, resize, rotate, and multi-select with marquee.
  4. **Lasso Selection tool** (`V`): Freeform lasso selection with smooth Bézier curve boundary.
  5. **Rectangle tool** (`2` or `R`): Draw sketchy rectangles with sharp or rounded corners.
  6. **Diamond tool** (`3` or `D`): Draw sketchy rhombuses.
  7. **Ellipse tool** (`4` or `O`): Draw sketchy circles and ellipses.
  8. **Arrow tool** (`5` or `A`): Draw sketchy directional arrows with customizable heads.
  9. **Line tool** (`6` or `L`): Draw straight lines.
  10. **Draw / Pencil tool** (`7` or `P`): Freehand sketching with smooth pressure simulation.
  11. **Text tool** (`8` or `T`): Inline editable text nodes with customizable font size and family.
  12. **Image tool** (`9`): Upload or drag-and-drop images onto canvas.
  13. **Eraser tool** (`0` or `E`): Click or drag to erase elements.
  14. **More tools** (`...`): Laser pointer with fading trail.
- **Top Right**:
  - Background Pattern Selector (`blank`, `dotted`, `fine-dotted`, `grid`, `large-grid`, `notebook`, `graph-paper`, `isometric`).
  - `Share` button (Indigo pill) with collaboration link / share dialog.

### 2.3 Initial Startup State — Completely Empty Canvas
When the application opens:
- The canvas center is 100% clean and empty without any placeholders, welcome text, logos, or empty-state messages.
- The UI layer renders only the fixed essential controls:
  - Top: `[Menu]       [Centered Toolbar]       [Essential Actions]`
  - Center: `EMPTY CANVAS`
  - Bottom: `[Zoom] [Undo/Redo]                   [Utilities]`

### 2.4 Bottom Floating Controls
- **Bottom Left**:
  - Zoom control pill: `—` (Zoom out), `100%` (Reset zoom to 100%), `+` (Zoom in).
  - History pill: Undo (`Ctrl+Z`), Redo (`Ctrl+Y` or `Ctrl+Shift+Z`).
- **Bottom Right**:
  - Local Storage Saved checkmark indicator.
  - Help button `?` opening a modal with keyboard shortcuts.

### 2.5 Element Properties Inspector Panel (Left Floating Sidebar)
Shown when element(s) are selected:
- **Stroke Color**: Color palette swatch + custom color picker.
- **Background Color**: Transparent + Pastel palette.
- **Fill Style**: Hachure (sketchy hatching), Cross-hatch, Solid, Zigzag.
- **Stroke Width**: Thin (1px), Medium (2px), Bold (4px), Extra Bold (6px).
- **Stroke Style**: Solid, Dashed, Dotted.
- **Sloppiness / Roughness**: Architect (0 / neat), Artist (1 / standard sketchy), Cartoonist (2 / messy).
- **Edges / Roundness**: Sharp corners vs Rounded corners.
- **Opacity**: 0% - 100% slider.
- **Layers**: Bring to Front (`Ctrl+]`), Bring Forward, Send Backward, Send to Back (`Ctrl+[`).
- **Align & Distribute**: Left, Center, Right, Top, Middle, Bottom.
- **Actions**: Duplicate (`Ctrl+D`), Delete (`Del` / `Backspace`), Lock.

---

## 3. Data Model & Architecture

### 3.1 Whiteboard Element Model
```typescript
export type ToolType = 
  | 'selection'
  | 'lasso'
  | 'pan'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'draw'
  | 'text'
  | 'image'
  | 'eraser'
  | 'laser';

export type BackgroundPattern = 
  | 'blank'
  | 'dotted'
  | 'fine-dotted'
  | 'grid'
  | 'large-grid'
  | 'notebook'
  | 'graph-paper'
  | 'isometric';
```

### 3.2 Rendering Engine
- HTML5 Canvas 2D + **Rough.js** for sketchy hand-drawn geometry.
- **Perfect-Freehand** for pressure-sensitive pencil sketching.
- Dedicated Layer Architecture: Canvas Layer (world transforms) and Fixed UI Layer (100% screen space).

---

## 4. Keyboard Shortcuts Cheatsheet
| Shortcut | Action |
| --- | --- |
| `1` | Selection Tool |
| `V` | Lasso Selection Tool |
| `H` or `Space + Drag` | Pan Viewport |
| `2` or `R` | Rectangle Tool |
| `3` or `D` | Diamond Tool |
| `4` or `O` | Ellipse Tool |
| `5` or `A` | Arrow Tool |
| `6` or `L` | Line Tool |
| `7` or `P` | Pencil / Freehand Draw |
| `8` or `T` | Text Tool |
| `9` | Insert Image |
| `0` or `E` | Eraser Tool |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + A` | Select All |
| `Ctrl + C` / `Ctrl + V` | Copy / Paste |
| `Ctrl + D` | Duplicate Selection |
| `Del` / `Backspace` | Delete Selection |
| `+` / `-` | Zoom In / Out |
| `Ctrl + 0` | Reset Zoom to 100% |
| `Ctrl + S` | Save File (.json) |
| `Ctrl + O` | Open File |
| `?` | Toggle Shortcuts / Help Modal |
