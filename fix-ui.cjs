const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');

const targetStr = '<button\n          onClick={() => {\n            removeSceneObject(activeObjectId);';

const helperText = `
        <div className="text-[10px] text-slate-400 italic text-center px-2">
          Tip: Hold Shift while dragging to move objects up and down.
        </div>
`;

code = code.replace(targetStr, helperText + targetStr);

fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
