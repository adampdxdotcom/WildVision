import {
  getSignedArea,
  isPolygonSelfIntersecting,
  getTessellatedPath,
} from '../../../../utils/geometry';

interface HandleMainWallNodeDragArgs {
  clientX: number;
  clientY: number;
  draggingVertexIndex: number;
  scale: number;
  wallVertices: { x: number; y: number }[] | undefined;
  setWallVertices: (val: { x: number; y: number }[] | ((prev: { x: number; y: number }[]) => { x: number; y: number }[])) => void;
  selectedVertexIndices: number[];
  archDragBehavior: 'symmetric' | 'proportional';
  screenToWall: (sx: number, sy: number) => { wx: number; wy: number };
  dragStartVertices: { x: number; y: number; isCurveNode?: boolean; isAngleLocked?: boolean; lockedAngleValue?: number | null; isLengthLocked?: boolean; lockedLengthValue?: number | null }[] | null | undefined;
  increment: number;
  isFreeform?: boolean;
  isOrtho?: boolean;
  dragStartVertexPos?: { x: number; y: number } | null;
}

export const handleMainWallNodeDrag = ({
  clientX,
  clientY,
  draggingVertexIndex,
  scale,
  wallVertices,
  setWallVertices,
  selectedVertexIndices,
  archDragBehavior,
  screenToWall,
  dragStartVertices,
  increment,
  isFreeform = false,
  isOrtho = false,
  dragStartVertexPos,
}: HandleMainWallNodeDragArgs): boolean => {
  if (!wallVertices || !setWallVertices) return false;
  let { wx: newX, wy: newY } = screenToWall(clientX, clientY);

  if (isOrtho && dragStartVertexPos) {
    const dx = Math.abs(newX - dragStartVertexPos.x);
    const dy = Math.abs(newY - dragStartVertexPos.y);
    if (dx > dy) {
      newY = dragStartVertexPos.y;
    } else {
      newX = dragStartVertexPos.x;
    }
  }

  const n = wallVertices.length;
  const newVertices = [...wallVertices];
  const node = newVertices[draggingVertexIndex] as any;
  const isGroupDrag = selectedVertexIndices && selectedVertexIndices.includes(draggingVertexIndex);

  if (!node.isCurveNode && !isFreeform) {
    // Restrict absolute coordinates strictly to nearest grid increment matching unit state
    newX = Math.round(newX / increment) * increment;
    newY = Math.round(newY / increment) * increment;
  }

  const rawWx = newX;
  const rawWy = newY;

  let wx = newX;
  let wy = newY;

  const isCCW = getSignedArea(wallVertices) >= 0;

  if (!node.isCurveNode) {
    if (node.isAngleLocked && node.lockedAngleValue === 180) {
      const prevIdx = (draggingVertexIndex - 1 + n) % n;
      const nextIdx = (draggingVertexIndex + 1) % n;
      const startVertices = dragStartVertices || wallVertices;
      const B_start = startVertices[draggingVertexIndex];
      const A_start = startVertices[prevIdx];
      const C_start = startVertices[nextIdx];

      const dxAC = C_start.x - A_start.x;
      const dyAC = C_start.y - A_start.y;
      const lenAC = Math.sqrt(dxAC * dxAC + dyAC * dyAC);
      if (lenAC > 1e-6) {
        const ux = dxAC / lenAC;
        const uy = dyAC / lenAC;

        const perpx = -uy;
        const perpy = ux;

        const deltaX = wx - B_start.x;
        const deltaY = wy - B_start.y;

        const delta_parallel = deltaX * ux + deltaY * uy;
        const delta_perpendicular = deltaX * perpx + deltaY * perpy;

        const B_new_x = B_start.x + delta_parallel * ux + delta_perpendicular * perpx;
        const B_new_y = B_start.y + delta_parallel * uy + delta_perpendicular * perpy;

        const A_new_x = A_start.x + delta_perpendicular * perpx;
        const A_new_y = A_start.y + delta_perpendicular * perpy;

        const C_new_x = C_start.x + delta_perpendicular * perpx;
        const C_new_y = C_start.y + delta_perpendicular * perpy;

        newVertices[draggingVertexIndex] = {
          ...newVertices[draggingVertexIndex],
          x: B_new_x,
          y: B_new_y,
        };
        newVertices[prevIdx] = {
          ...newVertices[prevIdx],
          x: A_new_x,
          y: A_new_y,
        };
        newVertices[nextIdx] = {
          ...newVertices[nextIdx],
          x: C_new_x,
          y: C_new_y,
        };

        // Propagate translation from prevIdx in step = -1 direction
        let curr = prevIdx;
        while (true) {
          const next = (curr - 1 + n) % n;
          if (next === draggingVertexIndex) break;
          const currNode = newVertices[curr] as any;
          if (currNode && currNode.isAngleLocked) {
            newVertices[next] = {
              ...newVertices[next],
              x: (startVertices[next]?.x ?? newVertices[next].x) + delta_perpendicular * perpx,
              y: (startVertices[next]?.y ?? newVertices[next].y) + delta_perpendicular * perpy,
            };
            curr = next;
          } else {
            break;
          }
        }

        // Propagate translation from nextIdx in step = +1 direction
        curr = nextIdx;
        while (true) {
          const next = (curr + 1) % n;
          if (next === draggingVertexIndex) break;
          const currNode = newVertices[curr] as any;
          if (currNode && currNode.isAngleLocked) {
            newVertices[next] = {
              ...newVertices[next],
              x: (startVertices[next]?.x ?? newVertices[next].x) + delta_perpendicular * perpx,
              y: (startVertices[next]?.y ?? newVertices[next].y) + delta_perpendicular * perpy,
            };
            curr = next;
          } else {
            break;
          }
        }

        const updateCurveNode = (curveIdx: number, p1Idx: number, p2Idx: number) => {
          const curve = startVertices[curveIdx] as any;
          const oldP1 = startVertices[p1Idx];
          const oldP2 = startVertices[p2Idx];
          const newP1 = newVertices[p1Idx];
          const newP2 = newVertices[p2Idx];

          let oldDx = oldP2.x - oldP1.x;
          let oldDy = oldP2.y - oldP1.y;
          const oldLen = Math.sqrt(oldDx * oldDx + oldDy * oldDy);

          let oldT = 0.5;
          let oldH = 0;
          if (oldLen > 0) {
            oldDx /= oldLen;
            oldDy /= oldLen;
            const oldPerpX = -oldDy;
            const oldPerpY = oldDx;

            const vx = curve.x - oldP1.x;
            const vy = curve.y - oldP1.y;
            const dotParallel = vx * oldDx + vy * oldDy;
            oldT = dotParallel / oldLen;
            oldH = vx * oldPerpX + vy * oldPerpY;
          }

          if (archDragBehavior === 'symmetric') {
            oldT = 0.5;
          }

          let newDx = newP2.x - newP1.x;
          let newDy = newP2.y - newP1.y;
          const newLen = Math.sqrt(newDx * newDx + newDy * newDy);
          if (newLen > 0) {
            newDx /= newLen;
            newDy /= newLen;
            const newPerpX = -newDy;
            const newPerpY = newDx;

            const newCx = newP1.x + newDx * (oldT * newLen) + newPerpX * oldH;
            const newCy = newP1.y + newDy * (oldT * newLen) + newPerpY * oldH;
            newVertices[curveIdx] = { ...curve, x: newCx, y: newCy };
          }
        };

        if ((wallVertices[prevIdx] as any).isCurveNode) {
          const p1Idx = (prevIdx - 1 + n) % n;
          updateCurveNode(prevIdx, p1Idx, draggingVertexIndex);
        }
        if ((wallVertices[nextIdx] as any).isCurveNode) {
          const p2Idx = (nextIdx + 1) % n;
          updateCurveNode(nextIdx, draggingVertexIndex, p2Idx);
        }

        if (!isPolygonSelfIntersecting(getTessellatedPath(newVertices))) {
          setWallVertices(newVertices);
        }
      }
      return true;
    }

    if (!node.isCurveNode && !isGroupDrag) {
      const prevIdx = (draggingVertexIndex - 1 + n) % n;
      const nextIdx = (draggingVertexIndex + 1) % n;
      const prevNode = newVertices[prevIdx] as any;
      const nextNode = newVertices[nextIdx] as any;

    const startVertices = dragStartVertices || wallVertices;
    const B_start = startVertices[draggingVertexIndex];
    const A_start = startVertices[prevIdx];
    const C_start = startVertices[nextIdx];

    const isALocked = (A_start as any).isAngleLocked && !(A_start as any).isCurveNode;
    const isCLocked = (C_start as any).isAngleLocked && !(C_start as any).isCurveNode;

    const dx1 = B_start.x - A_start.x;
    const dy1 = B_start.y - A_start.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = B_start.x - C_start.x;
    const dy2 = B_start.y - C_start.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (isALocked && isCLocked) {
      if (len1 > 1e-4 && len2 > 1e-4) {
        const u1 = { x: dx1 / len1, y: dy1 / len1 };
        const u2 = { x: dx2 / len2, y: dy2 / len2 };

        // Project the user's snapped cursor point from the initial starting position B_start
        const dot1 = (wx - B_start.x) * u1.x + (wy - B_start.y) * u1.y;
        const dot2 = (wx - B_start.x) * u2.x + (wy - B_start.y) * u2.y;

        const proj1 = { x: B_start.x + dot1 * u1.x, y: B_start.y + dot1 * u1.y };
        const proj2 = { x: B_start.x + dot2 * u2.x, y: B_start.y + dot2 * u2.y };

        const dist1Sq = Math.pow(wx - proj1.x, 2) + Math.pow(wy - proj1.y, 2);
        const dist2Sq = Math.pow(wx - proj2.x, 2) + Math.pow(wy - proj2.y, 2);

        let finalMoveDx = 0;
        let finalMoveDy = 0;
        let translateTarget: 'prev' | 'next' | null = null;

        if (dist1Sq <= dist2Sq) {
          finalMoveDx = proj1.x - B_start.x;
          finalMoveDy = proj1.y - B_start.y;
          translateTarget = 'next';
        } else {
          finalMoveDx = proj2.x - B_start.x;
          finalMoveDy = proj2.y - B_start.y;
          translateTarget = 'prev';
        }

        finalMoveDx = Math.round(finalMoveDx / increment) * increment;
        finalMoveDy = Math.round(finalMoveDy / increment) * increment;

        wx = B_start.x + finalMoveDx;
        wy = B_start.y + finalMoveDy;

        if (translateTarget === 'next') {
          newVertices[nextIdx] = {
            ...newVertices[nextIdx],
            x: C_start.x + finalMoveDx,
            y: C_start.y + finalMoveDy,
          };
          // Propagate translation from nextIdx (+1 direction)
          let curr = nextIdx;
          while (true) {
            const next = (curr + 1) % n;
            if (next === draggingVertexIndex) break;
            const currNode = newVertices[curr] as any;
            if (currNode && currNode.isAngleLocked) {
              newVertices[next] = {
                ...newVertices[next],
                x: (startVertices[next]?.x ?? newVertices[next].x) + finalMoveDx,
                y: (startVertices[next]?.y ?? newVertices[next].y) + finalMoveDy,
              };
              curr = next;
            } else {
              break;
            }
          }
        } else if (translateTarget === 'prev') {
          newVertices[prevIdx] = {
            ...newVertices[prevIdx],
            x: A_start.x + finalMoveDx,
            y: A_start.y + finalMoveDy,
          };
          // Propagate translation from prevIdx (-1 direction)
          let curr = prevIdx;
          while (true) {
            const next = (curr - 1 + n) % n;
            if (next === draggingVertexIndex) break;
            const currNode = newVertices[curr] as any;
            if (currNode && currNode.isAngleLocked) {
              newVertices[next] = {
                ...newVertices[next],
                x: (startVertices[next]?.x ?? newVertices[next].x) + finalMoveDx,
                y: (startVertices[next]?.y ?? newVertices[next].y) + finalMoveDy,
              };
              curr = next;
            } else {
              break;
            }
          }
        }
      }
    } else if (isALocked) {
      if (len1 > 1e-4) {
        const u1 = { x: dx1 / len1, y: dy1 / len1 };
        const dot1 = (wx - B_start.x) * u1.x + (wy - B_start.y) * u1.y;
        const finalMoveDx = Math.round((dot1 * u1.x) / increment) * increment;
        const finalMoveDy = Math.round((dot1 * u1.y) / increment) * increment;
        wx = B_start.x + finalMoveDx;
        wy = B_start.y + finalMoveDy;
      }
    } else if (isCLocked) {
      if (len2 > 1e-4) {
        const u2 = { x: dx2 / len2, y: dy2 / len2 };
        const dot2 = (wx - B_start.x) * u2.x + (wy - B_start.y) * u2.y;
        const finalMoveDx = Math.round((dot2 * u2.x) / increment) * increment;
        const finalMoveDy = Math.round((dot2 * u2.y) / increment) * increment;
        wx = B_start.x + finalMoveDx;
        wy = B_start.y + finalMoveDy;
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

          const distToRaw = Math.sqrt(Math.pow(ix - rawWx, 2) + Math.pow(iy - rawWy, 2));
          const doubleLineTolerance = 15 / scale;
          if (distToRaw < doubleLineTolerance) {
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
}

  const prevIdx = (draggingVertexIndex - 1 + n) % n;
  const nextIdx = (draggingVertexIndex + 1) % n;
  const A = newVertices[prevIdx] as any;
  const B = node as any;
  const C = newVertices[nextIdx] as any;

  if (node.isCurveNode) {
    let dx = C.x - A.x;
    let dy = C.y - A.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }
    const perpX = -dy;
    const perpY = dx;

    if (archDragBehavior === 'symmetric') {
      const midX = (A.x + C.x) / 2;
      const midY = (A.y + C.y) / 2;
      let dot = (wx - midX) * perpX + (wy - midY) * perpY;
      
      // Snap the scalar distance along the vector to the grid increment
      if (!isFreeform) {
        dot = Math.round(dot / increment) * increment;
      }
      
      wx = midX + perpX * dot;
      wy = midY + perpY * dot;
    }
  }

  if (!node.isCurveNode) {
    let targetX = wx;
    let targetY = wy;

    // Dynamically resolve lock states based on winding order
    const isSegmentABLOCKED = isCCW ? B.isLengthLocked : A.isLengthLocked;
    const isSegmentBCLOCKED = isCCW ? C.isLengthLocked : B.isLengthLocked;

    const lockedLenAB = isCCW ? B.lockedLengthValue : A.lockedLengthValue;
    const lockedLenBC = isCCW ? C.lockedLengthValue : B.lockedLengthValue;

    if (!isGroupDrag && isSegmentABLOCKED && isSegmentBCLOCKED) {
      return true; // Node is fully frozen, do not move.
    }
    
    if (isGroupDrag) {
      const isASelected = selectedVertexIndices.includes(prevIdx);
      const isCSelected = selectedVertexIndices.includes(nextIdx);
      if (isSegmentABLOCKED && !isASelected && isSegmentBCLOCKED && !isCSelected) {
        return true; // Node is fully frozen, do not move.
      }
    }

    if (!isGroupDrag) {
      if (isSegmentABLOCKED) {
         let L = lockedLenAB;
         if (L == null) L = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));

         if (A.isAngleLocked && !A.isCurveNode) {
           targetX = B.x;
           targetY = B.y;
         } else {
           let dx = targetX - A.x;
           let dy = targetY - A.y;
           const dist = Math.sqrt(dx * dx + dy * dy);
           if (dist > 0 && L != null) {
             targetX = A.x + (dx / dist) * L;
             targetY = A.y + (dy / dist) * L;
           }
         }
      } else if (isSegmentBCLOCKED) {
         let L = lockedLenBC;
         if (L == null) L = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));

         if (C.isAngleLocked && !C.isCurveNode) {
           targetX = B.x;
           targetY = B.y;
         } else {
           let dx = targetX - C.x;
           let dy = targetY - C.y;
           const dist = Math.sqrt(dx * dx + dy * dy);
           if (dist > 0 && L != null) {
             targetX = C.x + (dx / dist) * L;
             targetY = C.y + (dy / dist) * L;
           }
         }
      }
    } else {
      const isASelected = selectedVertexIndices.includes(prevIdx);
      const isCSelected = selectedVertexIndices.includes(nextIdx);

      if (isSegmentABLOCKED && !isASelected) {
         let L = lockedLenAB;
         if (L == null) L = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));

         if (A.isAngleLocked && !A.isCurveNode) {
           targetX = B.x; targetY = B.y;
         } else {
           let dx = targetX - A.x; let dy = targetY - A.y;
           const dist = Math.sqrt(dx * dx + dy * dy);
           if (dist > 0 && L != null) {
             targetX = A.x + (dx / dist) * L; targetY = A.y + (dy / dist) * L;
           }
         }
      } else if (isSegmentBCLOCKED && !isCSelected) {
         let L = lockedLenBC;
         if (L == null) L = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));

         if (C.isAngleLocked && !C.isCurveNode) {
           targetX = B.x; targetY = B.y;
         } else {
           let dx = targetX - C.x; let dy = targetY - C.y;
           const dist = Math.sqrt(dx * dx + dy * dy);
           if (dist > 0 && L != null) {
             targetX = C.x + (dx / dist) * L; targetY = C.y + (dy / dist) * L;
           }
         }
      }
    }

    wx = targetX;
    wy = targetY;
  }

  // Universal Mouse Position "Veto" Rule
  if (!node.isCurveNode) {
    const distToRawMouse = Math.sqrt(Math.pow(wx - rawWx, 2) + Math.pow(wy - rawWy, 2));
    const vetoThreshold = 20 / scale;
    if (distToRawMouse > vetoThreshold) {
      wx = rawWx;
      wy = rawWy;
    }
  }

  // Ensure exact mathematical rounding right at assignment
  if (!node.isCurveNode) {
    wx = Math.round(wx / increment) * increment;
    wy = Math.round(wy / increment) * increment;
  }

  let moveDx = wx - node.x;
  let moveDy = wy - node.y;

  newVertices[draggingVertexIndex] = { ...node, x: wx, y: wy };

  if (isGroupDrag) {
    selectedVertexIndices.forEach((idx) => {
      if (idx !== draggingVertexIndex && newVertices[idx]) {
        const finalGroupX = Math.round((newVertices[idx].x + moveDx) / increment) * increment;
        const finalGroupY = Math.round((newVertices[idx].y + moveDy) / increment) * increment;
        newVertices[idx] = { 
          ...newVertices[idx], 
          x: finalGroupX, 
          y: finalGroupY 
        };
      }
    });
  }

  if (!node.isCurveNode) {
    const prevIdx = (draggingVertexIndex - 1 + n) % n;
    const nextIdx = (draggingVertexIndex + 1) % n;

    const updateCurveNode = (curveIdx: number, p1Idx: number, p2Idx: number) => {
      if (isGroupDrag && selectedVertexIndices.includes(curveIdx)) return; // Already rigidly translated
      const curve = wallVertices[curveIdx] as any;
      const oldP1 = wallVertices[p1Idx];
      const oldP2 = wallVertices[p2Idx];
      const newP1 = newVertices[p1Idx];
      const newP2 = newVertices[p2Idx];

      let oldDx = oldP2.x - oldP1.x;
      let oldDy = oldP2.y - oldP1.y;
      const oldLen = Math.sqrt(oldDx * oldDx + oldDy * oldDy);

      let oldT = 0.5;
      let oldH = 0;
      if (oldLen > 0) {
        oldDx /= oldLen;
        oldDy /= oldLen;
        const oldPerpX = -oldDy;
        const oldPerpY = oldDx;

        const vx = curve.x - oldP1.x;
        const vy = curve.y - oldP1.y;
        const dotParallel = vx * oldDx + vy * oldDy;
        oldT = dotParallel / oldLen;
        oldH = vx * oldPerpX + vy * oldPerpY;
      }

      if (archDragBehavior === 'symmetric') {
        oldT = 0.5;
      }

      let newDx = newP2.x - newP1.x;
      let newDy = newP2.y - newP1.y;
      const newLen = Math.sqrt(newDx * newDx + newDy * newDy);
      if (newLen > 0) {
        newDx /= newLen;
        newDy /= newLen;
        const newPerpX = -newDy;
        const newPerpY = newDx;

        const newCx = newP1.x + newDx * (oldT * newLen) + newPerpX * oldH;
        const newCy = newP1.y + newDy * (oldT * newLen) + newPerpY * oldH;
        newVertices[curveIdx] = { ...curve, x: newCx, y: newCy };
      }
    };

    if ((wallVertices[prevIdx] as any).isCurveNode) {
      const p1Idx = (prevIdx - 1 + n) % n;
      updateCurveNode(prevIdx, p1Idx, draggingVertexIndex);
    }
    if ((wallVertices[nextIdx] as any).isCurveNode) {
      const p2Idx = (nextIdx + 1) % n;
      updateCurveNode(nextIdx, draggingVertexIndex, p2Idx);
    }
  }

  if (node.isCurveNode || !isPolygonSelfIntersecting(getTessellatedPath(newVertices))) {
    setWallVertices(newVertices);
  }
  return true; // Node processed
};
