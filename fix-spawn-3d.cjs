const fs = require('fs');
const path = require('path');

const boxesFile = path.join(__dirname, 'src/components/Sidebar/RoomSetup/CustomBoxesPanel.tsx');
let boxesContent = fs.readFileSync(boxesFile, 'utf8');

boxesContent = boxesContent.replace(
  "position: viewMode === '2d' ? [roomDimensions.width / 2, 12, -(roomDimensions.depth / 2) + 12] : [0, -roomDimensions.height / 2, -(roomDimensions.depth / 2) + 12]",
  "position: [0, -roomDimensions.height / 2 + 12, -(roomDimensions.depth / 2) + 12]"
);
fs.writeFileSync(boxesFile, boxesContent);

const clayFile = path.join(__dirname, 'src/components/Sidebar/RoomSetup/ClayModelsPanel.tsx');
let clayContent = fs.readFileSync(clayFile, 'utf8');

clayContent = clayContent.replace(
  "position: viewMode === '2d' ? [roomDimensions.width / 2, (m.dimensions ? m.dimensions[1] : 24) / 2, -(roomDimensions.depth / 2) + ((m.dimensions ? m.dimensions[2] : 24) / 2)] : [0, -roomDimensions.height / 2, -(roomDimensions.depth / 2) + ((m.dimensions ? m.dimensions[2] : 24) / 2)]",
  "position: [0, -roomDimensions.height / 2 + ((m.dimensions ? m.dimensions[1] : 24) / 2), -(roomDimensions.depth / 2) + ((m.dimensions ? m.dimensions[2] : 24) / 2)]"
);
fs.writeFileSync(clayFile, clayContent);
