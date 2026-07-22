const ts = require('typescript');
const fs = require('fs');

const fileContent = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const sourceFile = ts.createSourceFile(
  'useCanvasInteractions.ts',
  fileContent,
  ts.ScriptTarget.Latest,
  true
);

let hasErrors = false;
function checkNodes(node) {
  if (node.kind === ts.SyntaxKind.Unknown) {
    hasErrors = true;
    console.log("Syntax error at", node.pos);
  }
  ts.forEachChild(node, checkNodes);
}
checkNodes(sourceFile);
console.log('Syntax check complete, hasErrors:', hasErrors);
