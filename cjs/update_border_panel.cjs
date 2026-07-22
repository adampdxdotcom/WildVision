const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/BorderConfigPanel.tsx', 'utf8');
code = code.replace("Add Border Tile", "Enable Perimeter Border");
fs.writeFileSync('src/components/Sidebar/BorderConfigPanel.tsx', code);
