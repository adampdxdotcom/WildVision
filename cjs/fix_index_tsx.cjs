const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/index.tsx', 'utf8');

// 1. Add import
content = content.replace(
  "import { useCanvasRenderer } from './hooks/useCanvasRenderer';",
  "import { useCanvasRenderer } from './hooks/useCanvasRenderer';\nimport { useTouchNavigation } from './hooks/dragHandlers/useTouchNavigation';"
);

// 2. Remove refs from index.tsx
const refsToRemove = `  const activeTouchPointersRef = React.useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartDistRef = React.useRef<number | null>(null);
  const pinchStartZoomRef = React.useRef<number>(1);
  const pinchStartMidRef = React.useRef<{ x: number; y: number } | null>(null);
  const pinchStartPanRef = React.useRef<{ x: number; y: number } | null>(null);`;

content = content.replace(refsToRemove, '');

// 3. Init useTouchNavigation
const initTouchNav = `  const {
    handleTouchDown,
    handleTouchMove,
    handleTouchUp,
    handleTouchCancel
  } = useTouchNavigation({
    containerRef,
    zoom,
    setZoom,
    panXRef,
    panYRef,
    setPanX,
    setPanY,
    handlePanStart,
    handlePanMove,
    handlePanEnd
  });`;

content = content.replace(
  "  React.useEffect(() => {",
  initTouchNav + "\n\n  React.useEffect(() => {"
);

// 4. Update pointer handlers
// handlePointerDown
content = content.replace(
  /    if \(e.pointerType === 'touch'\) \{[\s\S]*?      return;\n    \}/,
  "    if (e.pointerType === 'touch') {\n      handleTouchDown(e);\n      return;\n    }"
);

// handlePointerMove
content = content.replace(
  /    if \(e.pointerType === 'touch'\) \{[\s\S]*?      return;\n    \}/,
  "    if (e.pointerType === 'touch') {\n      handleTouchMove(e);\n      return;\n    }"
);

// handlePointerUp
content = content.replace(
  /    if \(e.pointerType === 'touch'\) \{[\s\S]*?      return;\n    \}/,
  "    if (e.pointerType === 'touch') {\n      handleTouchUp(e);\n      return;\n    }"
);

// handlePointerLeave
content = content.replace(
  /    if \(e.pointerType === 'touch'\) \{[\s\S]*?      return;\n    \}/,
  "    if (e.pointerType === 'touch') {\n      handleTouchCancel(e);\n      return;\n    }"
);


fs.writeFileSync('src/components/TileCanvas/index.tsx', content);
