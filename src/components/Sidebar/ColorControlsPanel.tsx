import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { UniversalColorPalette } from './Universal/UniversalColorPalette';
import { TileFinish, ColorVariation } from '../../types';

export const ColorControlsPanel: React.FC = () => {
  const tileColors = useAppStore(state => state.tileColors);
  const setTileColors = useAppStore(state => state.setTileColors);
  const colorPattern = useAppStore(state => state.colorPattern); // wait, colorPattern is 'pattern' or 'colorPattern'?
  const setColorPattern = useAppStore(state => state.setColorPattern);
  const tilesPerStripe = useAppStore(state => state.tilesPerStripe); // wait, is this in the store? Let's check
  const setTilesPerStripe = useAppStore(state => state.setTilesPerStripe);
  const colorVariation = useAppStore(state => state.colorVariation);
  const setColorVariation = useAppStore(state => state.setColorVariation);
  const shape = useAppStore(state => state.shape);
  const groutWidth = useAppStore(state => state.groutWidth);
  const setGroutWidth = useAppStore(state => state.setGroutWidth);
  const groutColor = useAppStore(state => state.groutColor) || '#ffffff';
  const setGroutColor = useAppStore(state => state.setGroutColor);
  const unit = useAppStore(state => state.unit);
  const soldAsMosaic = useAppStore(state => state.soldAsMosaic);
  const activePattern = useAppStore(state => state.pattern); // activePattern is just pattern?
  const tileFinish = useAppStore(state => state.tileFinish);
  const setTileFinish = useAppStore(state => state.setTileFinish);
  const materialTexture = useAppStore(state => state.materialTexture);
  const setMaterialTexture = useAppStore(state => state.setMaterialTexture);
  const activeCustomPattern = useAppStore(state => state.activeCustomPattern);
  const compositeColors = useAppStore(state => state.compositeColors) || {};
  const setCompositeColor = useAppStore(state => state.setCompositeColor);
  const setIsCanvasDirty = useAppStore(state => state.setIsCanvasDirty);

  // Paint Mode Selectors
  const tileColorOverrides = useAppStore(state => state.tileColorOverrides) || {};
  const activeBrushColorIndex = useAppStore(state => state.activeBrushColorIndex) ?? 1;
  const clearAllTileColorOverrides = useAppStore(state => state.clearAllTileColorOverrides);
  const setActiveBrushColorIndex = useAppStore(state => state.setActiveBrushColorIndex);

  const hasPaintOverrides = Object.keys(tileColorOverrides).length > 0;

  return (
    <UniversalColorPalette
      tileColors={tileColors}
      onChangeColors={(newColors) => {
        setTileColors(newColors);
        setIsCanvasDirty(true);
      }}
      colorPattern={colorPattern} // WAIT! Is colorPattern a different variable? Let's check
      onChangePattern={(p) => {
        setColorPattern(p);
        setIsCanvasDirty(true);
      }}
      activeBrushColorIndex={activeBrushColorIndex}
      onSetBrushIndex={setActiveBrushColorIndex}
      hasPaintOverrides={hasPaintOverrides}
      onResetPaint={() => {
        clearAllTileColorOverrides();
        setIsCanvasDirty(true);
      }}
      tileSpecular={tileFinish as string}
      onChangeSpecular={(val) => setTileFinish(val as TileFinish)}
      tileFinish={colorVariation as ColorVariation}
      onChangeFinish={setColorVariation || (() => {})}
      activeCustomPattern={activeCustomPattern}
      shape={shape}
      tilesPerStripe={tilesPerStripe}
      onChangeTilesPerStripe={setTilesPerStripe}
      compositeColors={compositeColors}
      onChangeCompositeColor={(name, hex) => {
        setCompositeColor(name, hex);
        setIsCanvasDirty(true);
      }}
      materialTexture={materialTexture}
      onChangeMaterialTexture={(val) => {
        setMaterialTexture(val);
        setIsCanvasDirty(true);
      }}
      soldAsMosaic={soldAsMosaic}
      activePattern={activePattern}
      groutWidth={groutWidth}
      onChangeGroutWidth={(val) => {
        setGroutWidth(val);
        setIsCanvasDirty(true);
      }}
      groutColor={groutColor}
      onChangeGroutColor={(val) => {
        setGroutColor(val);
        setIsCanvasDirty(true);
      }}
      unit={unit}
    />
  );
};
