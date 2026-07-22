const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Auth/AdminConsole/ModelLibraryTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/max-h-\[320px\]/g, 'max-h-[264px]');

fs.writeFileSync(filePath, content);
console.log('Successfully patched list height');
