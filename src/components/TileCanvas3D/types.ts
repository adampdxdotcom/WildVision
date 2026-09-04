import * as THREE from 'three';

export interface Panel3D {
  startX: number;
  startY: number;
  width: number;
  height: number;
  d3Width: number;
  d3Height: number;
  d3CenterY: number;
  texture: THREE.Texture;
  backingTexture: THREE.Texture;
  bumpTexture?: THREE.Texture;
  isGhost?: boolean;
  foldAngle?: number;
  invertMaterials?: boolean;
  hasFramingExtrusion?: boolean;
  hasTopCap?: boolean;
  hasLeftEndCap?: boolean;
  hasRightEndCap?: boolean;
}

export interface ColumnSegment {
  width: number;
  d3Width: number;
  mainRow: Panel3D;
  topFlaps: Panel3D[];
  bottomFlaps: Panel3D[];
  foldAngle?: number;
  rightFoldAngle?: number;
  startX?: number;
  endX?: number;
  isRoot?: boolean;
}

export interface FeatureProps {
  sa: any;
  panel: Panel3D;
  bounds: any;
  to3D: (val: number) => number;
  localX: number;
  localY?: number;
  d3Width: number;
  d3Height: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
}
