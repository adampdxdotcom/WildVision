import { useEffect, useState } from 'react';

export const useRedrawListener = () => {
  const [redrawTrigger, setRedrawTrigger] = useState(0);

  useEffect(() => {
    const handleForceRedraw = () => {
      setRedrawTrigger((prev) => prev + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wildvision:forceCanvasRedraw', handleForceRedraw);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wildvision:forceCanvasRedraw', handleForceRedraw);
      }
    };
  }, []);

  return redrawTrigger;
};
