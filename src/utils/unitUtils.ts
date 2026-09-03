import { MeasurementUnit } from '../types';
import { useAppStore } from '../store/useAppStore';

export function switchMeasurementUnit(newUnit: MeasurementUnit) {
  const state = useAppStore.getState();
  const currentUnit = state.unit;
  if (newUnit === currentUnit) return;

  state.setUnit(newUnit);

  const ratio = newUnit === 'cm' ? 2.54 : 1 / 2.54;

  const {
    wallWidth, setWallWidth,
    wallHeight, setWallHeight,
    tileWidth, setTileWidth,
    tileHeight, setTileHeight,
    groutWidth, setGroutWidth,
    wallArchHeight, setWallArchHeight,
    wallArchDepth, setWallArchDepth,
    subAreas, setSubAreas,
    wallExtensions, setWallExtensions,
    wallVertices, setWallVertices,
  } = state;

  if (wallWidth !== undefined && setWallWidth) {
    setWallWidth(Number((wallWidth * ratio).toFixed(1)));
  }
  if (wallHeight !== undefined && setWallHeight) {
    setWallHeight(Number((wallHeight * ratio).toFixed(1)));
  }
  if (tileWidth !== undefined && setTileWidth) {
    setTileWidth(Number((tileWidth * ratio).toFixed(2)));
  }
  if (tileHeight !== undefined && setTileHeight) {
    setTileHeight(Number((tileHeight * ratio).toFixed(2)));
  }
  if (groutWidth !== undefined && setGroutWidth) {
    setGroutWidth(Number((groutWidth * ratio).toFixed(3)));
  }
  if (wallArchHeight && setWallArchHeight) {
    setWallArchHeight(Number((wallArchHeight * ratio).toFixed(1)));
  }
  if (wallArchDepth && setWallArchDepth) {
    setWallArchDepth(Number((wallArchDepth * ratio).toFixed(1)));
  }

  if (subAreas && setSubAreas) {
    setSubAreas((prev) =>
      prev.map((sa) => ({
        ...sa,
        x: Number((sa.x * ratio).toFixed(2)),
        y: Number((sa.y * ratio).toFixed(2)),
        width: Number((sa.width * ratio).toFixed(2)),
        height: Number((sa.height * ratio).toFixed(2)),
        tileWidth: sa.tileWidth ? Number((sa.tileWidth * ratio).toFixed(2)) : sa.tileWidth,
        tileHeight: sa.tileHeight ? Number((sa.tileHeight * ratio).toFixed(2)) : sa.tileHeight,
        groutWidth: sa.groutWidth ? Number((sa.groutWidth * ratio).toFixed(3)) : sa.groutWidth,
      }))
    );
  }

  if (wallExtensions && setWallExtensions) {
    setWallExtensions((prev) =>
      prev.map((ext) => ({
        ...ext,
        x: Number((ext.x * ratio).toFixed(2)),
        y: Number((ext.y * ratio).toFixed(2)),
        width: Number((ext.width * ratio).toFixed(2)),
        height: Number((ext.height * ratio).toFixed(2)),
      }))
    );
  }

  if (wallVertices && wallVertices.length > 0 && setWallVertices) {
    setWallVertices((prev) =>
      prev.map((v) => ({
        ...v,
        x: Number((v.x * ratio).toFixed(3)),
        y: Number((v.y * ratio).toFixed(3)),
      }))
    );
  }
}
