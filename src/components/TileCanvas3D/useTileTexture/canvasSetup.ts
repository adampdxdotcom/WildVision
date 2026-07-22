import { getCombinedWallBounds } from '../../../utils/geometry';
import { Viewport } from '../../TileCanvas/canvasUtils';

export interface CanvasSetupResult {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  bumpCanvas: HTMLCanvasElement | null;
  bumpCtx: CanvasRenderingContext2D | null;
  viewport: Viewport;
}

export const setupBakingCanvases = (
  wallWidth: number,
  wallHeight: number,
  wallExtensions: any[],
  wallVertices: any[],
  enableRealisticDepth: boolean
): CanvasSetupResult => {
  const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);

  const maxDim = 2048;
  const canvasScale = maxDim / Math.max(bounds.width, bounds.height || 1);
  const canvasWidth = bounds.width * canvasScale;
  const canvasHeight = bounds.height * canvasScale;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  const bumpCanvas = enableRealisticDepth ? document.createElement('canvas') : null;
  if (bumpCanvas) {
    bumpCanvas.width = canvasWidth;
    bumpCanvas.height = canvasHeight;
  }
  const bumpCtx = bumpCanvas ? bumpCanvas.getContext('2d') : null;

  const viewport: Viewport = {
    cornerX: 0,
    cornerY: 0,
    renderW: canvasWidth,
    renderH: canvasHeight,
    scale: canvasScale,
    minX: bounds.minX,
    minY: bounds.minY,
  };

  return {
    canvas,
    ctx,
    bumpCanvas,
    bumpCtx,
    viewport,
  };
};
