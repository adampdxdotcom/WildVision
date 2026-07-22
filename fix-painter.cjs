const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/painters/stagingPainter.ts');
let content = `import { SceneObject } from '../../../types';
import { Viewport, mapToCanvas } from '../canvasUtils';

const imageCache = new Map<string, HTMLImageElement>();

export const renderStagingProps = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  sceneObjects: Record<string, SceneObject>,
  roomDimensions: { width: number; height: number },
  showLabels: boolean
) => {
  const props = Object.values(sceneObjects).filter(
    (obj) => (obj.type === 'custom_box' || obj.type === 'clay_model') && obj.metadata?.showIn2D
  );

  for (const prop of props) {
    const x2d = prop.position[0] + (roomDimensions.width / 2);
    const y2d = prop.position[1] + (roomDimensions.height / 2);
    
    const centerPt = mapToCanvas(x2d, y2d, viewport);
    const width = (prop.metadata?.dimensions?.[0] || 12) * viewport.scale;
    const height = (prop.metadata?.dimensions?.[1] || 12) * viewport.scale;

    ctx.save();
    
    if (prop.type === 'custom_box') {
      ctx.fillStyle = prop.color || '#333333';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(centerPt.x - (width / 2), centerPt.y - (height / 2), width, height);

      ctx.strokeStyle = prop.color || '#333333';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 2;
      ctx.strokeRect(centerPt.x - (width / 2), centerPt.y - (height / 2), width, height);

      if (showLabels && prop.metadata?.name) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prop.metadata.name, centerPt.x, centerPt.y);
      }
    } else if (prop.type === 'clay_model' && prop.metadata?.svgUrl) {
      const url = prop.metadata.svgUrl;
      let img = imageCache.get(url);
      if (!img) {
        img = new Image();
        img.src = url;
        imageCache.set(url, img);
      }
      
      if (img.complete && img.naturalWidth !== 0) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(img, centerPt.x - (width / 2), centerPt.y - (height / 2), width, height);
      } else {
        ctx.fillStyle = '#cccccc';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(centerPt.x - (width / 2), centerPt.y - (height / 2), width, height);
      }
      
      if (showLabels && prop.metadata?.name) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        const textWidth = ctx.measureText(prop.metadata.name).width;
        ctx.fillRect(centerPt.x - textWidth/2 - 4, centerPt.y - 8, textWidth + 8, 16);
        
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000000';
        ctx.fillText(prop.metadata.name, centerPt.x, centerPt.y);
      }
    }

    ctx.restore();
  }
};
`;

fs.writeFileSync(file, content);
