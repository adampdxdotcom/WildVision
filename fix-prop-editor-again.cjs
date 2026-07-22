const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');

code = code.replace(
  /const isWallLocked = activeObject\.metadata\?\.isWallLocked === true;\n\s*const objHeight = activeObject\.metadata\?\.dimensions\?\.\[1\] \|\| 0;\n\s*\/\/ When wall locked, position\[1\] is the center\. When on floor, position\[1\] is the bottom\.\n\s*const currentBottomY = isWallLocked \? activeObject\.position\[1\] - \(objHeight \/ 2\) : activeObject\.position\[1\];\n\s*const displayElevation = Math\.max\(0, currentBottomY\);\n\s*const maxElevation = Math\.max\(0, roomDimensions\.height - objHeight\);/,
  `const isWallLocked = activeObject.metadata?.isWallLocked === true;
  const objHeight = activeObject.metadata?.dimensions?.[1] || 0;
  const roomFloorY = -roomDimensions.height / 2;

  // Determine the true Y coordinate of the box's bottom edge
  const currentBottomY = isWallLocked 
    ? activeObject.position[1] - (objHeight / 2) 
    : activeObject.position[1];

  // Display 0 when touching the floor
  const displayElevation = Math.max(0, currentBottomY - roomFloorY);
  const maxElevation = Math.max(0, roomDimensions.height - objHeight);`
);

code = code.replaceAll(
  /const sliderValue = parseFloat\(e\.target\.value\) \|\| 0;\n\s*const newTrueY = isWallLocked \? sliderValue \+ \(objHeight \/ 2\) : sliderValue;/g,
  `const sliderValue = parseFloat(e.target.value) || 0;
  // Convert UI value back to 3D bottom edge, then adjust for anchor type
  const newBottomY = roomFloorY + sliderValue;
  const newTrueY = isWallLocked ? newBottomY + (objHeight / 2) : newBottomY;`
);

fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
