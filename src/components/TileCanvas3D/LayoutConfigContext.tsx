import React, { createContext, useContext } from 'react';
import { SubArea, TileFinish } from '../../types';

export interface LayoutConfig {
  wallWidth: number;
  wallHeight: number;
  wallExtensions: any[];
  wallVertices: { x: number; y: number; isCurveNode?: boolean }[];
  subAreas: SubArea[];
  tileFinish: TileFinish;
}

export const LayoutConfigContext = createContext<LayoutConfig | null>(null);

export const useLayoutConfig = () => useContext(LayoutConfigContext);
