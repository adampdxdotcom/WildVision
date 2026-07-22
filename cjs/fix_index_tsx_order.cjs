const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/index.tsx', 'utf8');

// Find the initTouchNav block
const touchNavMatch = content.match(/  const \{\n    handleTouchDown,\n    handleTouchMove,\n    handleTouchUp,\n    handleTouchCancel\n  \} = useTouchNavigation\(\{[\s\S]*?  \}\);\n/);

if (touchNavMatch) {
  content = content.replace(touchNavMatch[0], '');
  
  // Insert after useCanvasViewport
  const viewportMatch = content.match(/  \} = useCanvasViewport\(\{[\s\S]*?  \}\);\n/);
  
  if (viewportMatch) {
    content = content.replace(viewportMatch[0], viewportMatch[0] + "\n" + touchNavMatch[0]);
    fs.writeFileSync('src/components/TileCanvas/index.tsx', content);
    console.log('Fixed order');
  } else {
    console.log('Could not find useCanvasViewport');
  }
} else {
  console.log('Could not find useTouchNavigation');
}
