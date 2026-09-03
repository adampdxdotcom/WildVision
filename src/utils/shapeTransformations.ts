import { SubArea } from '../types';

/**
 * Translates a SubArea by deltas dx and dy.
 * Adjusts its position (x, y) and translates all polygon vertices if present.
 */
export function translateSubArea(subArea: SubArea, dx: number, dy: number): SubArea {
  const newX = subArea.x + dx;
  const newY = subArea.y + dy;

  const newVertices =
    subArea.vertices && subArea.vertices.length > 0
      ? subArea.vertices.map((v) => ({
          ...v,
          x: v.x + dx,
          y: v.y + dy,
        }))
      : subArea.vertices;

  return {
    ...subArea,
    x: newX,
    y: newY,
    vertices: newVertices,
  };
}

/**
 * Resizes a SubArea based on a drag handle ('bl', 'br', 'tl', 'tr', 'l', 'r', 't', 'b') and target point (targetX, targetY).
 * Enforces a minimum size (minSize) and proportionally scales any polygon vertices if present.
 */
export function resizeSubArea(
  subArea: SubArea,
  handle: string,
  targetX: number,
  targetY: number,
  minSize: number = 6
): SubArea {
  const oldX = subArea.x;
  const oldY = subArea.y;
  const oldW = subArea.width;
  const oldH = subArea.height;

  let newX = oldX;
  let newY = oldY;
  let newW = oldW;
  let newH = oldH;

  if (handle.includes('r')) {
    newW = Math.max(minSize, targetX - oldX);
    newX = oldX;
  } else if (handle.includes('l')) {
    const right = oldX + oldW;
    newW = Math.max(minSize, right - targetX);
    newX = right - newW;
  }

  if (handle.includes('t')) {
    newH = Math.max(minSize, targetY - oldY);
    newY = oldY;
  } else if (handle.includes('b')) {
    const top = oldY + oldH;
    newH = Math.max(minSize, top - targetY);
    newY = top - newH;
  }

  const scaleX = oldW > 0 ? newW / oldW : 1;
  const scaleY = oldH > 0 ? newH / oldH : 1;

  const newVertices =
    subArea.vertices && subArea.vertices.length > 0
      ? subArea.vertices.map((v) => ({
          ...v,
          x: newX + (v.x - oldX) * scaleX,
          y: newY + (v.y - oldY) * scaleY,
        }))
      : subArea.vertices;

  return {
    ...subArea,
    x: newX,
    y: newY,
    width: newW,
    height: newH,
    vertices: newVertices,
  };
}
