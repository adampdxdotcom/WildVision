const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');

code = code.replace(
  /const objHeight = activeObject\.metadata\?\.dimensions\?\.\[1\] \|\| 0;\n\s*const restingFloorY = -\(roomDimensions\.height \/ 2\) \+ \(objHeight \/ 2\);\n\s*const displayElevation = Math\.max\(0, activeObject\.position\[1\] - restingFloorY\);/,
  `const objHeight = activeObject.metadata?.dimensions?.[1] || 0;
  const yOffset = objHeight / 2;
  const displayElevation = Math.max(0, activeObject.position[1] - yOffset);`
);

code = code.replaceAll('restingFloorY + sliderValue', 'sliderValue + yOffset');

fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
