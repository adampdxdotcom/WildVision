const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexStart = /const handleDragStart = \([\s\S]*?if \(isClickingPaintableTarget\) \{\n\s*setIsDragging\(true\);\n\s*handleDragPaint\(clientX, clientY, isShiftPressed\);\n\s*return;\n\s*\}/m;

const replacementStart = `const handleDragStart = (clientX: number, clientY: number, isShiftPressed: boolean = false) => {
    const state = useAppStore.getState();
    const { wx, wy } = screenToWall(clientX, clientY);

    const activeSa = activeSubAreaId ? state.subAreas.find(s => s.id === activeSubAreaId) : null;
    const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && state.colorPattern === 'paint');

    if (isActiveContextPainting) {
      const hit = handleDragPaint(clientX, clientY, isShiftPressed);
      if (hit) {
        setIsDragging(true);
        return;
      }
    }`;

content = content.replace(regexStart, replacementStart);

const regexMove = /const handleDragMove = \([\s\S]*?if \(isPaintingMove\) \{\n\s*handleDragPaint\(clientX, clientY, isOrtho\);\n\s*return;\n\s*\}/m;

const replacementMove = `const handleDragMove = (clientX: number, clientY: number, isFreeform: boolean = false, isOrtho: boolean = false) => {
    const state = useAppStore.getState();
    const { wx, wy } = screenToWall(clientX, clientY);

    const activeSa = activeSubAreaId ? state.subAreas.find(s => s.id === activeSubAreaId) : null;
    const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && state.colorPattern === 'paint');

    if (isActiveContextPainting && isDragging && !draggingSubAreaId && !draggingExtensionId && draggingVertexIndex === null && draggingSubAreaVertexIndex === null && !draggingSegment) {
      const hit = handleDragPaint(clientX, clientY, isOrtho);
      if (hit) {
        return;
      }
    }`;

content = content.replace(regexMove, replacementMove);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced drag handlers effectively');
