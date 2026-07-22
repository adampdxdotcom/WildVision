const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

const importRegex = /import \* as THREE from 'three';/;
code = code.replace(importRegex, "import * as THREE from 'three';\nimport { useThree } from '@react-three/fiber';");

// We need a helper component to manage the camera swap and snapping because useThree must be inside <Canvas>
const componentCode = `
const CameraManager = ({ orthoLock, controlsRef, savedCameraFov }) => {
  const { camera, set, size } = useThree();
  const prevOrthoLock = React.useRef(orthoLock);

  React.useEffect(() => {
    if (orthoLock && !prevOrthoLock.current) {
      // Smart Snap
      if (controlsRef.current) {
        const controls = controlsRef.current;
        const target = controls.target;
        const camPos = camera.position;
        
        // Calculate azimuthal angle
        const dx = camPos.x - target.x;
        const dz = camPos.z - target.z;
        let angle = Math.atan2(dx, dz);
        
        // Snap to nearest 90 deg (PI/2)
        const snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        
        // Maintain distance (but maybe we should flatten Y?)
        // The prompt says "perfectly head-on", so we should probably match the target's Y or set Y to 0?
        // Let's keep the existing polar angle or set it to PI/2 (head on)? "perfectly head-on" usually means y = target.y.
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        camPos.x = target.x + distance * Math.sin(snapAngle);
        camPos.z = target.z + distance * Math.cos(snapAngle);
        // Head-on implies same Y as target
        camPos.y = target.y;
        
        controls.update();
      }
    }
    prevOrthoLock.current = orthoLock;
  }, [orthoLock, camera, controlsRef]);

  return (
    <>
      <PerspectiveCamera makeDefault={!orthoLock} fov={savedCameraFov} position={[0,0,4.5]} />
      <OrthographicCamera 
        makeDefault={orthoLock} 
        zoom={size.height / (2 * 4.5 * Math.tan((savedCameraFov / 2) * (Math.PI / 180)))} // Rough initial zoom, we can refine this
      />
    </>
  );
};
`;

// Insert after TileCanvas3D declaration or before?
// Before TileCanvas3D:
code = code.replace('export const TileCanvas3D: React.FC = () => {', componentCode + '\nexport const TileCanvas3D: React.FC = () => {');

// Render CameraManager inside <Canvas>
code = code.replace(
  '<CameraController controlsRef={controlsRef} />',
  '<CameraController controlsRef={controlsRef} />\n          <CameraManager orthoLock={orthoLock} controlsRef={controlsRef} savedCameraFov={savedCameraFov} />'
);

fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
