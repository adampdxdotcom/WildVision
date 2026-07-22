const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

const replacement = `const CameraManager = ({ orthoLock, controlsRef, savedCameraFov }) => {
  const { size } = useThree();
  const prevOrthoLock = React.useRef(orthoLock);

  const perspRef = React.useRef(null);
  const orthoRef = React.useRef(null);

  const aspect = size.height > 0 ? size.width / size.height : 1;
  const frustumSize = 6;

  React.useEffect(() => {
    if (orthoLock && !prevOrthoLock.current) {
      if (controlsRef.current && perspRef.current && orthoRef.current) {
        const controls = controlsRef.current;
        const target = controls.target;
        const camPos = perspRef.current.position;
        
        const distance = Math.max(0.1, camPos.distanceTo(target));
        
        const dx = camPos.x - target.x;
        const dz = camPos.z - target.z;
        let angle = Math.atan2(dx, dz);
        
        const snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        
        orthoRef.current.position.x = target.x + distance * Math.sin(snapAngle);
        orthoRef.current.position.z = target.z + distance * Math.cos(snapAngle);
        orthoRef.current.position.y = camPos.y; 
        orthoRef.current.zoom = 1;
        orthoRef.current.updateProjectionMatrix();
        
        controls.update();
      }
    } else if (!orthoLock && prevOrthoLock.current) {
      if (controlsRef.current && perspRef.current && orthoRef.current) {
        const controls = controlsRef.current;
        perspRef.current.position.copy(orthoRef.current.position);
        perspRef.current.updateProjectionMatrix();
        controls.update();
      }
    }
    prevOrthoLock.current = orthoLock;
  }, [orthoLock, controlsRef, savedCameraFov, size.height]);

  const livePos = useAppStore.getState().liveCameraPosition;
  const initialPos = React.useMemo<[number, number, number]>(() => livePos && livePos.length === 3 ? [livePos[0], livePos[1], livePos[2]] : [0, 0, 4.5], []);

  return (
    <>
      <PerspectiveCamera ref={perspRef} makeDefault={!orthoLock} fov={savedCameraFov} position={initialPos} near={0.1} far={1000} />
      <OrthographicCamera 
        ref={orthoRef}
        makeDefault={orthoLock} 
        left={(frustumSize * aspect) / -2}
        right={(frustumSize * aspect) / 2}
        top={frustumSize / 2}
        bottom={frustumSize / -2}
        position={initialPos}
        near={-1000}
        far={1000}
      />
    </>
  );
};`;

code = code.replace(/const CameraManager = \({[\s\S]*?return \([\s\S]*?\);\n};\n/, replacement + '\n');
fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
