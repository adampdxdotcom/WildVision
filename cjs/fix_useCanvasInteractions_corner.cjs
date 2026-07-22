const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

code = code.replace(
  "const [draggingSubAreaCorner, setDraggingSubAreaCorner] = useState<'bl' | 'br' | 'tl' | 'tr' | null>(null);",
  "const [draggingSubAreaCorner, setDraggingSubAreaCorner] = useState<'bl' | 'br' | 'tl' | 'tr' | null>(null);\n\n  const handleSetDraggingSubAreaCorner = (corner: 'bl' | 'br' | 'tl' | 'tr' | null) => {\n    if (corner !== null && activeSubAreaId) {\n      const elementId = \`subarea_\${activeSubAreaId}\`;\n      if (lockedElements[elementId] && lockedElements[elementId] !== user?.id) return;\n      if (user) {\n        acquireLock(elementId, user.id);\n        broadcastLock(elementId, user.id);\n      }\n    } else {\n      if (draggingSubAreaCorner !== null && activeSubAreaId && user) {\n        const elementId = \`subarea_\${activeSubAreaId}\`;\n        releaseLock(elementId);\n        broadcastUnlock(elementId);\n      }\n    }\n    setDraggingSubAreaCorner(corner);\n  };"
);

code = code.replace(/setDraggingSubAreaCorner\(/g, "handleSetDraggingSubAreaCorner(");
code = code.replace("const [draggingSubAreaCorner, handleSetDraggingSubAreaCorner] = useState", "const [draggingSubAreaCorner, setDraggingSubAreaCorner] = useState");

// Let's also wrap draggingSegment just to be thorough.
code = code.replace(
  "const [draggingSegment, setDraggingSegment] = useState<{\n    type: 'wall' | 'fold';\n    indexA: number;\n    indexB: number;\n    Nx: number;\n    Ny: number;\n    origA: { x: number; y: number };\n    origB: { x: number; y: number };\n  } | null>(null);",
  "const [draggingSegment, setDraggingSegment] = useState<{\n    type: 'wall' | 'fold';\n    indexA: number;\n    indexB: number;\n    Nx: number;\n    Ny: number;\n    origA: { x: number; y: number };\n    origB: { x: number; y: number };\n  } | null>(null);\n\n  const handleSetDraggingSegment = (segment: any | null) => {\n    if (segment !== null) {\n      const elementId = \`segment_\${segment.type}_\${segment.indexA}_\${segment.indexB}\`;\n      if (lockedElements[elementId] && lockedElements[elementId] !== user?.id) return;\n      if (user) {\n        acquireLock(elementId, user.id);\n        broadcastLock(elementId, user.id);\n      }\n    } else {\n      if (draggingSegment !== null && user) {\n        const elementId = \`segment_\${draggingSegment.type}_\${draggingSegment.indexA}_\${draggingSegment.indexB}\`;\n        releaseLock(elementId);\n        broadcastUnlock(elementId);\n      }\n    }\n    setDraggingSegment(segment);\n  };"
);

code = code.replace(/setDraggingSegment\(/g, "handleSetDraggingSegment(");
code = code.replace("const [draggingSegment, handleSetDraggingSegment] = useState", "const [draggingSegment, setDraggingSegment] = useState");

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', code);
