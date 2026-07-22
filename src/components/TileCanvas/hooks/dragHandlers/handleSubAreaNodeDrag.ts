import { SubArea } from '../../../../types';
import {
  getSignedArea,
  getSubAreaVertices,
} from '../../../../utils/geometry';

interface HandleSubAreaNodeDragArgs {
  clientX: number;
  clientY: number;
  draggingSubAreaVertexIndex: number;
  scale: number;
  subAreas: SubArea[];
  setSubAreas: (val: SubArea[] | ((prev: SubArea[]) => SubArea[])) => void;
  activeSubAreaId: string | null;
  archDragBehavior: 'symmetric' | 'proportional';
  screenToWall: (sx: number, sy: number) => { wx: number; wy: number };
  increment: number;
  isFreeform?: boolean;
  isOrtho?: boolean;
  dragStartVertexPos?: { x: number; y: number } | null;
}

export const handleSubAreaNodeDrag = ({
  clientX,
  clientY,
  draggingSubAreaVertexIndex,
  scale,
  subAreas,
  setSubAreas,
  activeSubAreaId,
  archDragBehavior,
  screenToWall,
  increment,
  isFreeform = false,
  isOrtho = false,
  dragStartVertexPos,
}: HandleSubAreaNodeDragArgs): boolean => {
  if (!activeSubAreaId) return false;
  let { wx: rawWx, wy: rawWy } = screenToWall(clientX, clientY);

  if (isOrtho && dragStartVertexPos) {
    const dx = Math.abs(rawWx - dragStartVertexPos.x);
    const dy = Math.abs(rawWy - dragStartVertexPos.y);
    if (dx > dy) {
      rawWy = dragStartVertexPos.y;
    } else {
      rawWx = dragStartVertexPos.x;
    }
  }

  let wx = rawWx;
  let wy = rawWy;

  const activeSa = subAreas.find((sa) => sa.id === activeSubAreaId);
  if (activeSa && !activeSa.locked) {
    const saVertices = getSubAreaVertices(activeSa);
    const n = saVertices.length;

    const newVertices = [...saVertices];
    const node = { ...newVertices[draggingSubAreaVertexIndex] } as any;

    if (node.isCurveNode) {
      const prev = saVertices[(draggingSubAreaVertexIndex - 1 + n) % n];
      const next = saVertices[(draggingSubAreaVertexIndex + 1) % n];

      let dx = next.x - prev.x;
      let dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      const perpX = -dy;
      const perpY = dx;

      if (archDragBehavior === 'symmetric') {
        const midX = (prev.x + next.x) / 2;
        const midY = (prev.y + next.y) / 2;
        let dot = (wx - midX) * perpX + (wy - midY) * perpY;
        
        // Snap the scalar distance along the vector to the grid increment
        if (!isFreeform) {
          dot = Math.round(dot / increment) * increment;
        }
        
        wx = midX + perpX * dot;
        wy = midY + perpY * dot;
      }
    } else {
      if (!isFreeform) {
        wx = Math.round(wx / increment) * increment;
        wy = Math.round(wy / increment) * increment;
      }
      const prevIdx = (draggingSubAreaVertexIndex - 1 + n) % n;
      const nextIdx = (draggingSubAreaVertexIndex + 1) % n;
      const prevNode = saVertices[prevIdx] as any;
      const nextNode = saVertices[nextIdx] as any;
      const isCCW = getSignedArea(saVertices) >= 0;

      let constrainedLines: { p: { x: number; y: number }; angle: number }[] = [];

      if (prevNode.isAngleLocked && prevNode.lockedAngleValue !== undefined && prevNode.lockedAngleValue !== null) {
        const prevPrevIdx = (prevIdx - 1 + n) % n;
        const A = saVertices[prevPrevIdx];
        const B = prevNode;
        const interiorRad = (prevNode.lockedAngleValue * Math.PI) / 180;
        const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
        const angleBC = isCCW ? angleBA - interiorRad : angleBA + interiorRad;
        constrainedLines.push({ p: B, angle: angleBC });
      }

      if (nextNode.isAngleLocked && nextNode.lockedAngleValue !== undefined && nextNode.lockedAngleValue !== null) {
        const nextNextIdx = (nextIdx + 1) % n;
        const C = saVertices[nextNextIdx];
        const B = nextNode;
        const interiorRad = (nextNode.lockedAngleValue * Math.PI) / 180;
        const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
        const angleBA = isCCW ? angleBC + interiorRad : angleBC - interiorRad;
        constrainedLines.push({ p: B, angle: angleBA });
      }

      if (constrainedLines.length === 1) {
        const l1 = constrainedLines[0];
        const dx1 = Math.cos(l1.angle);
        const dy1 = Math.sin(l1.angle);
        const dot = (wx - l1.p.x) * dx1 + (wy - l1.p.y) * dy1;
        wx = l1.p.x + dx1 * dot;
        wy = l1.p.y + dy1 * dot;
      } else if (constrainedLines.length === 2) {
        const l1 = constrainedLines[0];
        const l2 = constrainedLines[1];
        const p1 = l1.p;
        const p2 = { x: l1.p.x + Math.cos(l1.angle), y: l1.p.y + Math.sin(l1.angle) };
        const p3 = l2.p;
        const p4 = { x: l2.p.x + Math.cos(l2.angle), y: l2.p.y + Math.sin(l2.angle) };
        const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(denom) > 1e-6) {
          wx =
            ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / denom;
          wy =
            ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / denom;
        } else {
          const dx1 = Math.cos(l1.angle);
          const dy1 = Math.sin(l1.angle);
          const dot = (wx - l1.p.x) * dx1 + (wy - l1.p.y) * dy1;
          wx = l1.p.x + dx1 * dot;
          wy = l1.p.y + dy1 * dot;
        }
      } else if (!isFreeform) {
        const STEP_RAD = (15 * Math.PI) / 180;

        const trySnap = (fixedNode: { x: number; y: number }) => {
          const dx = wx - fixedNode.x;
          const dy = wy - fixedNode.y;
          const distToNodeSq = dx * dx + dy * dy;
          if (distToNodeSq < 0.01) return null;

          let a = Math.atan2(dy, dx);
          let snapped = Math.round(a / STEP_RAD) * STEP_RAD;

          const dist = Math.abs(dx * Math.sin(snapped) - dy * Math.cos(snapped));
          const distPixels = dist * scale;
          const thresholdPixels = 15;
          if (distPixels <= thresholdPixels) {
            return { p: fixedNode, angle: snapped };
          }
          return null;
        };

        let snapL1 = trySnap(prevNode);
        let snapL2 = trySnap(nextNode);

        if (snapL1 && snapL2) {
          const p1 = snapL1.p;
          const p2 = { x: snapL1.p.x + Math.cos(snapL1.angle), y: snapL1.p.y + Math.sin(snapL1.angle) };
          const p3 = snapL2.p;
          const p4 = { x: snapL2.p.x + Math.cos(snapL2.angle), y: snapL2.p.y + Math.sin(snapL2.angle) };
          const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);

          let intersected = false;
          if (Math.abs(denom) > 1e-4) {
            const ix =
              ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / denom;
            const iy =
              ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / denom;

            const distSq = Math.pow(ix - wx, 2) + Math.pow(iy - wy, 2);
            const maxAllowedDist = Math.max(
              Math.sqrt(Math.pow(prevNode.x - nextNode.x, 2) + Math.pow(prevNode.y - nextNode.y, 2)) * 0.5,
              10
            );
            if (distSq < maxAllowedDist * maxAllowedDist) {
              wx = ix;
              wy = iy;
              intersected = true;
            }
          }

          if (!intersected) {
            const diff1 = Math.abs(Math.sin(Math.atan2(wy - prevNode.y, wx - prevNode.x) - snapL1.angle));
            const diff2 = Math.abs(Math.sin(Math.atan2(wy - nextNode.y, wx - nextNode.x) - snapL2.angle));
            if (diff1 < diff2) {
              const dx = Math.cos(snapL1.angle);
              const dy = Math.sin(snapL1.angle);
              const dot = (wx - snapL1.p.x) * dx + (wy - snapL1.p.y) * dy;
              wx = snapL1.p.x + dx * dot;
              wy = snapL1.p.y + dy * dot;
            } else {
              const dx = Math.cos(snapL2.angle);
              const dy = Math.sin(snapL2.angle);
              const dot = (wx - snapL2.p.x) * dx + (wy - snapL2.p.y) * dy;
              wx = snapL2.p.x + dx * dot;
              wy = snapL2.p.y + dy * dot;
            }
          }
        } else if (snapL1) {
          const dx = Math.cos(snapL1.angle);
          const dy = Math.sin(snapL1.angle);
          const dot = (wx - snapL1.p.x) * dx + (wy - snapL1.p.y) * dy;
          wx = snapL1.p.x + dx * dot;
          wy = snapL1.p.y + dy * dot;
        } else if (snapL2) {
          const dx = Math.cos(snapL2.angle);
          const dy = Math.sin(snapL2.angle);
          const dot = (wx - snapL2.p.x) * dx + (wy - snapL2.p.y) * dy;
          wx = snapL2.p.x + dx * dot;
          wy = snapL2.p.y + dy * dot;
        }
      }
    }

    newVertices[draggingSubAreaVertexIndex] = {
      ...node,
      x: node.isCurveNode ? wx : Math.round(wx / increment) * increment,
      y: node.isCurveNode ? wy : Math.round(wy / increment) * increment,
    };

    if (!node.isCurveNode) {
      const prevIdx = (draggingSubAreaVertexIndex - 1 + n) % n;
      const nextIdx = (draggingSubAreaVertexIndex + 1) % n;

      const updateCurveNode = (curveIdx: number, p1Idx: number, p2Idx: number) => {
        const curve = saVertices[curveIdx] as any;
        const oldP1 = saVertices[p1Idx];
        const oldP2 = saVertices[p2Idx];
        const newP1 = newVertices[p1Idx];
        const newP2 = newVertices[p2Idx];

        const oldMidX = (oldP1.x + oldP2.x) / 2;
        const oldMidY = (oldP1.y + oldP2.y) / 2;
        const newMidX = (newP1.x + newP2.x) / 2;
        const newMidY = (newP1.y + newP2.y) / 2;

        const dx = curve.x - oldMidX;
        const dy = curve.y - oldMidY;

        newVertices[curveIdx] = {
          ...curve,
          x: newMidX + dx,
          y: newMidY + dy,
        };
      };

      if ((saVertices[prevIdx] as any).isCurveNode) {
        const p1Idx = (prevIdx - 1 + n) % n;
        updateCurveNode(prevIdx, p1Idx, draggingSubAreaVertexIndex);
      }
      if ((saVertices[nextIdx] as any).isCurveNode) {
        const p2Idx = (nextIdx + 1) % n;
        updateCurveNode(nextIdx, draggingSubAreaVertexIndex, p2Idx);
      }
    }

    const xs = newVertices.map((v) => v.x);
    const ys = newVertices.map((v) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    setSubAreas(
      subAreas.map((sa) => {
        if (sa.id === activeSubAreaId) {
          return {
            ...sa,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            vertices: newVertices,
          };
        }
        return sa;
      })
    );
  }
  return true;
};
