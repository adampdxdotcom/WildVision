const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/Sidebar/WallSetupPanel.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add imports
content = content.replace(
  "import { RoomSetupEditor } from './RoomSetupEditor';",
  "import { RoomSetupEditor } from './RoomSetupEditor';\nimport { CustomBoxesPanel } from './RoomSetup/CustomBoxesPanel';\nimport { ClayModelsPanel } from './RoomSetup/ClayModelsPanel';"
);

// Inject into mode === 'setup'
content = content.replace(
  "            onLoadCustomPreset={onLoadCustomPreset}\n          />\n        )}\n      </div>\n    );\n  }",
  "            onLoadCustomPreset={onLoadCustomPreset}\n          />\n        )}\n        <CustomBoxesPanel />\n        <ClayModelsPanel />\n      </div>\n    );\n  }"
);

// Inject into default return
content = content.replace(
  "        wallHeight={wallHeight}\n      />\n    </div>\n  );\n};",
  "        wallHeight={wallHeight}\n      />\n      <CustomBoxesPanel />\n      <ClayModelsPanel />\n    </div>\n  );\n};"
);

fs.writeFileSync(file, content);
