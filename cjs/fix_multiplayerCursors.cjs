const fs = require('fs');

let code = fs.readFileSync('src/components/TileCanvas/MultiplayerCursors.tsx', 'utf8');

code = code.replace(
  "const otherUsers = Object.values(onlineUsers || {}).filter(u => u.id !== user?.id && u.cursorX !== undefined && u.cursorY !== undefined);",
  "const localUserId = user?.id;\n  const otherUsers = Object.values(onlineUsers || {}).filter(u => u.id !== localUserId && u.cursorX !== undefined && u.cursorY !== undefined);"
);

fs.writeFileSync('src/components/TileCanvas/MultiplayerCursors.tsx', code);
