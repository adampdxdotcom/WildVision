const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');
code = code.replace(/<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<button/, '</div>\n          </div>\n        </div>\n\n        <button');
fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
