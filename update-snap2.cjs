const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

const replacement = `const CameraManager = ({ orthoLock, controlsRef, savedCameraFov }) => {
  const { camera, size } = useThree();
  const prevOrthoLock = React.useRef(orthoLock);
  const [orthoZoom, setOrthoZoom] = React.useState(100);

  React.useEffect(() => {
    if (orthoLock && !prevOrthoLock.current) {
      if (controlsRef.current) {
        const controls = controlsRef.current;
        const target = controls.target;
        const camPos = camera.position;
        
        // Calculate distance before snapping
        const distance = camPos.distanceTo(target);
        
        // Match Perspective frustum height at target distance
        const frustumHeight = 2 * distance * Math.tan((savedCameraFov / 2) * (Math.PI / 180));
        
        // Orthographic zoom is (viewport height) / (frustum height)
        const calculatedZoom = size.height / frustumHeight;
        setOrthoZoom(calculatedZoom);
        
        // Calculate azimuthal angle
        const dx = camPos.x - target.x;
        const dz = camPos.z - target.z;
        let angle = Math.atan2(dx, dz);
        
        // Snap to nearest 90 deg (PI/2)
        const snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        
        // Maintain distance but perfectly head-on to the Front, Back, Left, Right
        camPos.x = target.x + distance * Math.sin(snapAngle);
        camPos.z = target.z + distance * Math.cos(snapAngle);
        camPos.y = target.y; // Head on (same height as target)
        
        controls.update();
      }
    }
    prevOrthoLock.current = orthoLock;
  }, [orthoLock, camera, controlsRef, savedCameraFov, size.height]);

  return (
    <>
      <PerspectiveCamera makeDefault={!orthoLock} fov={savedCameraFov} near={0.1} far={1000} />
      <OrthographicCamera 
        makeDefault={orthoLock} 
        zoom={orthoZoom} 
        near={-1000}
        far={1000}
      />
    </>
  );
};`;

code = code.replace(/const CameraManager = \({[\s\S]*?return \([\s\S]*?\);\n};\n/, replacement + '\n');
fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
