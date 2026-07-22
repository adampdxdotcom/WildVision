const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

const replacement = `const CameraManager = ({ orthoLock, controlsRef, savedCameraFov }) => {
  const { size } = useThree();
  const prevOrthoLock = React.useRef(orthoLock);
  const [orthoZoom, setOrthoZoom] = React.useState(100);

  const perspRef = React.useRef(null);
  const orthoRef = React.useRef(null);

  React.useEffect(() => {
    if (orthoLock && !prevOrthoLock.current) {
      if (controlsRef.current && perspRef.current && orthoRef.current) {
        const controls = controlsRef.current;
        const target = controls.target;
        const camPos = perspRef.current.position;
        
        const distance = camPos.distanceTo(target);
        const frustumHeight = 2 * distance * Math.tan((savedCameraFov / 2) * (Math.PI / 180));
        const calculatedZoom = size.height / frustumHeight;
        setOrthoZoom(calculatedZoom);
        
        const dx = camPos.x - target.x;
        const dz = camPos.z - target.z;
        let angle = Math.atan2(dx, dz);
        
        const snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        
        orthoRef.current.position.x = target.x + distance * Math.sin(snapAngle);
        orthoRef.current.position.z = target.z + distance * Math.cos(snapAngle);
        orthoRef.current.position.y = target.y; 
        
        controls.object = orthoRef.current;
        controls.update();
      }
    } else if (!orthoLock && prevOrthoLock.current) {
      if (controlsRef.current && perspRef.current && orthoRef.current) {
        const controls = controlsRef.current;
        perspRef.current.position.copy(orthoRef.current.position);
        controls.object = perspRef.current;
        controls.update();
      }
    }
    prevOrthoLock.current = orthoLock;
  }, [orthoLock, controlsRef, savedCameraFov, size.height]);

  const livePos = useAppStore.getState().liveCameraPosition;
  const initialPos = React.useMemo(() => livePos && livePos.length === 3 ? [livePos[0], livePos[1], livePos[2]] : [0, 0, 4.5], []);

  return (
    <>
      <PerspectiveCamera ref={perspRef} makeDefault={!orthoLock} fov={savedCameraFov} position={initialPos} near={0.1} far={1000} />
      <OrthographicCamera 
        ref={orthoRef}
        makeDefault={orthoLock} 
        zoom={orthoZoom} 
        position={initialPos}
        near={-1000}
        far={1000}
      />
    </>
  );
};`;

code = code.replace(/const CameraManager = \({[\s\S]*?return \([\s\S]*?\);\n};\n/, replacement + '\n');
fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
