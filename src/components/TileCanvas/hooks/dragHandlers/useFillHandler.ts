import { sliceWallIntoRegions, isPointInPolygon, getTessellatedPath } from '../../../../utils/geometry';
import { useAppStore } from '../../../../store/useAppStore';

interface UseFillHandlerProps {
  wallVertices: any[];
  foldLines: any[];
  subAreas: any[];
  setSubAreas: (update: any) => void;
  setActiveSubAreaId: (id: string | null) => void;
  setActiveTool: (tool: string) => void;
  setIsDragging: (isDragging: boolean) => void;
  unit: string;
}

export const useFillHandler = ({
  wallVertices,
  foldLines,
  subAreas,
  setSubAreas,
  setActiveSubAreaId,
  setActiveTool,
  setIsDragging,
  unit
}: UseFillHandlerProps) => {

  const handleFillClick = (wx: number, wy: number): boolean => {
    const regions = sliceWallIntoRegions(wallVertices, foldLines);
    const clickedRegion = regions.find(region => {
      const tessellated = getTessellatedPath(region);
      return isPointInPolygon(wx, wy, tessellated);
    });
    
    if (clickedRegion) {
      const xs = clickedRegion.map(v => v.x);
      const ys = clickedRegion.map(v => v.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const isCm = unit === 'cm';
      const newSa = {
        id: `sa_${Date.now()}`,
        name: `Accent Panel ${subAreas.length + 1}`,
        x: Number(minX.toFixed(2)),
        y: Number(minY.toFixed(2)),
        width: Number((maxX - minX).toFixed(2)),
        height: Number((maxY - minY).toFixed(2)),
        shape: 'custom_polygon' as const,
        tileWidth: isCm ? 10 : 4,
        tileHeight: isCm ? 10 : 4,
        pattern: 'stack' as const,
        tileColors: ['#0f766e'],
        colorPattern: 'single' as const,
        groutColor: '#cbd5e1',
        groutWidth: isCm ? 0.3 : 0.125,
        offsetX: 0,
        offsetY: 0,
        tileSpecular: true,
        tileFinish: 'satin',
        tileName: 'Accent Teal Glass Mosaic',
        useLabelColor: true,
        labelColor: '#ffffff',
        customPatternPayload: null,
        vertices: clickedRegion.map(v => ({ x: v.x, y: v.y, isCurveNode: v.isCurveNode })),
      };

      setSubAreas((prev: any) => [...prev, newSa]);
      setActiveSubAreaId(newSa.id);
      setActiveTool('select');
    }
    setIsDragging(false);
    return true;
  };

  return {
    handleFillClick
  };
};
