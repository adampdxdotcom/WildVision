const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/Sidebar/ActivePropEditor.tsx');
let content = fs.readFileSync(file, 'utf8');

const zElevationHtmlStart = content.indexOf('<div className="pt-2 border-t border-slate-100">');
const zElevationHtmlEnd = content.indexOf('<div className="pt-2 border-t border-slate-100 space-y-2">', zElevationHtmlStart + 1);

if (zElevationHtmlStart !== -1 && zElevationHtmlEnd !== -1) {
    content = content.substring(0, zElevationHtmlStart) + content.substring(zElevationHtmlEnd);
}

fs.writeFileSync(file, content);
