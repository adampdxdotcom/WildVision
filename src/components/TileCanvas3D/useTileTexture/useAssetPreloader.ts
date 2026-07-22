import { useEffect, useState } from 'react';
import { SubArea } from '../../../types';
import { availableMaterialTextures, getLoadedTextureImage } from '../../../store/useAppStore';

export const useAssetPreloader = (
  materialTexture: string,
  subAreas: SubArea[]
) => {
  const [materialImage, setMaterialImage] = useState<HTMLImageElement | null>(null);
  const [accentTexturesLoadedKey, setAccentTexturesLoadedKey] = useState(0);

  // Preload main material image
  useEffect(() => {
    if (!materialTexture || materialTexture === 'none') {
      setMaterialImage(null);
      return;
    }
    const texDef = availableMaterialTextures.find(t => t.id === materialTexture);
    if (!texDef) {
       setMaterialImage(null);
       return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setMaterialImage(img);
    };
    img.src = texDef.url;
  }, [materialTexture]);

  // Determine if all textures are loaded
  let isReady = true;

  if (materialTexture !== 'none' && (!materialImage || materialImage.src.indexOf(materialTexture) === -1)) {
    isReady = false;
  }

  const texturesToLoad = Array.from(
    new Set(
      subAreas
        .map((sa) => sa.materialTexture)
        .filter((t): t is string => !!t && t !== 'none')
    )
  );

  let anyLoading = false;
  texturesToLoad.forEach((texId) => {
    const img = getLoadedTextureImage(texId, () => {
      setAccentTexturesLoadedKey((prev) => prev + 1);
    });
    if (!img) {
      anyLoading = true;
    }
  });

  if (anyLoading) {
    isReady = false;
  }

  return {
    isReady,
    materialImage,
    accentTexturesLoadedKey,
  };
};
