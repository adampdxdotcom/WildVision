const fs = require('fs');
const content = fs.readFileSync('src/components/Auth/AdminConsole/ModelLibraryTab.tsx', 'utf8');

const snapshotCode = `
import { useThree } from '@react-three/fiber';

const SnapshotHandler = ({ setCaptureFn, onCapture }: { setCaptureFn: (fn: () => void) => void, onCapture: (url: string) => void }) => {
  const { gl, scene, camera } = useThree();
  
  React.useEffect(() => {
    setCaptureFn(() => () => {
      const oldBg = scene.background;
      scene.background = null;
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      scene.background = oldBg;
      onCapture(dataUrl);
    });
    return () => setCaptureFn(() => () => {});
  }, [gl, scene, camera, setCaptureFn, onCapture]);

  return null;
};
`;

let newContent = content.replace(
  /const ClayModelPreview =/,
  snapshotCode + '\nconst ClayModelPreview ='
);

newContent = newContent.replace(
  /import \{ Canvas \} from '@react-three\/fiber';/,
  /import { Canvas, useThree } from '@react-three\/fiber';/
); // But snapshotCode already has import, wait, let's just remove the import in snapshotCode and put it at top.
