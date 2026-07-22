const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf-8');

// The replacement for SidebarControls
const sidebarControlsReplacement = `<SidebarControls
              onResetAlignment={handleResetAlignment}
              onNudge={handleNudge}
              statsReport={statsReport}
            />`;

c = c.replace(/<SidebarControls[\s\S]*?statsReport={statsReport}\n\s*setOffsetX=\{setOffsetX\}\n\s*setOffsetY=\{setOffsetY\}\n\s*\/>/g, sidebarControlsReplacement);
// Wait, the formatting might be slightly different. Let's do a reliable replace:
const startSidebar = c.indexOf('<SidebarControls');
const endSidebar = c.indexOf('/>', startSidebar) + 2;

if (startSidebar > -1 && endSidebar > startSidebar && c.substring(startSidebar, endSidebar).includes('statsReport')) {
  c = c.substring(0, startSidebar) + sidebarControlsReplacement + c.substring(endSidebar);
}

// The replacement for TileCanvas
const tileCanvasReplacement = `<TileCanvas />`;

const startCanvas = c.indexOf('<TileCanvas');
const endCanvas = c.indexOf('/>', startCanvas) + 2;

if (startCanvas > -1 && endCanvas > startCanvas && c.substring(startCanvas, endCanvas).includes('wallWidth={wallWidth}')) {
  c = c.substring(0, startCanvas) + tileCanvasReplacement + c.substring(endCanvas);
}

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx cleaned.');
