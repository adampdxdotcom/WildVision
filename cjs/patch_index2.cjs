const fs = require('fs');
const path = 'src/components/TileCanvas3D/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\} else if \(!isRecessed && attachedPlane === planeKey && subAreas && subAreas\.length > 0\) \{[\s\S]*?\}\s*\n\s*return shape;\n\s*\};\n/g;

const replacement = `} else {
        const nicheHoles = holeConfigByPlane[planeKey] || [];
        nicheHoles.forEach((hc) => {
          const hole = new THREE.Path();
          // Draw CLOCKWISE so Three.js triangulation recognizes it as a hole
          hole.moveTo(clampX(hc.xLeft), clampY(hc.yBottom));
          hole.lineTo(clampX(hc.xLeft), clampY(hc.yTop));
          hole.lineTo(clampX(hc.xRight), clampY(hc.yTop));
          hole.lineTo(clampX(hc.xRight), clampY(hc.yBottom));
          hole.closePath();
          shape.holes.push(hole);
        });
      }

      return shape;
    };
`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync(path, code);
  console.log('Patched index.tsx successfully');
} else {
  console.log('Regex did not match');
}
