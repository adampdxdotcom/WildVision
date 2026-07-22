const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

code = code.replace("  const [orthoZoom, setOrthoZoom] = React.useState(100);\n", "");

code = code.replace(
  `        const optimalFrustumHeight = 6;
        const calculatedZoom = Math.max(1, size.height / optimalFrustumHeight);
        setOrthoZoom(calculatedZoom);`,
  `        const optimalFrustumHeight = 6;
        orthoRef.current.zoom = Math.max(1, size.height / optimalFrustumHeight);`
);

code = code.replace("        zoom={orthoZoom} \n", "");

fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
