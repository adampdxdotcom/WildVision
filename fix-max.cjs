const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');

code = code.replace(
  'const maxElevation = maxElevation;',
  'const maxElevation = Math.max(0, roomDimensions.height - objHeight);'
);

fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
