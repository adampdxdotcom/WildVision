const fs = require('fs');
let content = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');
content = content.replace(/\\\`/g, '`');
content = content.replace(/\\\${/g, '${');
fs.writeFileSync('src/utils/pdfExport.ts', content);
