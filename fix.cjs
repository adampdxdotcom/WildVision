const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', 'utf8');

// Add currentProjectId if not there
if (!code.includes('const currentProjectId')) {
  code = code.replace(
    "const orthoLock = useAppStore(state => state.orthoLock);",
    "const orthoLock = useAppStore(state => state.orthoLock);\n  const currentProjectId = useAppStore(state => state.currentProjectId);"
  );
}

// Ensure useEffect is imported
if (!code.includes('useEffect')) {
  code = code.replace("import React from 'react';", "import React, { useEffect } from 'react';");
}

// Add handleBlobReady and dispatch
const handleCaptureCode = `  const handleCaptureElevation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCapturing) return;
    setIsCapturing(true);
    // Trigger the capture
    window.dispatchEvent(new CustomEvent('wildvision:trigger-elevation-capture'));
  };

  useEffect(() => {
    const handleBlobReady = async (e: any) => {
      const blob = e.detail;
      const fileName = \`\${user?.id}/elevations/elev_\${currentProjectId || 'local'}_\${Date.now()}.jpg\`;
      
      // Mocking the rest of the upload since it wasn't fully provided
      setTimeout(() => {
        setIsCapturing(false);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 2500);
      }, 1500);
    };

    window.addEventListener('wildvision:elevation-blob-ready', handleBlobReady);
    return () => window.removeEventListener('wildvision:elevation-blob-ready', handleBlobReady);
  }, [user, currentProjectId]);`;

code = code.replace(
  /  const handleCaptureElevation = \([\s\S]*?1500\);\n  };/,
  handleCaptureCode
);

fs.writeFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', code);
