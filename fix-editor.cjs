const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');

code = code.replace(
  /const objHeight = activeObject\.metadata\?\.dimensions\?\.\[1\] \|\| 0;\n\s*const yOffset = objHeight \/ 2;\n\s*const displayElevation = Math\.max\(0, activeObject\.position\[1\] - yOffset\);/,
  `const isWallLocked = activeObject.metadata?.isWallLocked === true;
  const objHeight = activeObject.metadata?.dimensions?.[1] || 0;
  // When wall locked, position[1] is the center. When on floor, position[1] is the bottom.
  const currentBottomY = isWallLocked ? activeObject.position[1] - (objHeight / 2) : activeObject.position[1];
  const displayElevation = Math.max(0, currentBottomY);
  const maxElevation = Math.max(0, roomDimensions.height - objHeight);`
);

code = code.replaceAll('Math.max(0, roomDimensions.height - objHeight)', 'maxElevation');

code = code.replaceAll(
  /const sliderValue = parseFloat\(e\.target\.value\) \|\| 0;\n\s*const newTrueY = sliderValue \+ yOffset;/g,
  `const sliderValue = parseFloat(e.target.value) || 0;
                  const newTrueY = isWallLocked ? sliderValue + (objHeight / 2) : sliderValue;`
);

fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
