import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { SubArea } from '../../../types';
import { getInternalAngle, getSignedArea, getTessellatedPath, isPolygonSelfIntersecting, formatVisualAngle } from '../../../utils/geometry';

function getAngleBetweenSegments(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): number {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;

  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);

  let diff = (Math.abs(angle2 - angle1) * 180) / Math.PI;
  diff = diff % 360;
  if (diff < 0) diff += 360;
  return diff;
}

export function useInteractiveActions(
  editingLengthIndex: number | null,
  setEditingLengthIndex: (index: number | null) => void,
  editingLengthSubAreaId: string | null = null,
  setEditingLengthSubAreaId: (id: string | null) => void = () => {}
) {
  const wallVertices = useAppStore(state => state.wallVertices);
  const setWallVertices = useAppStore(state => state.setWallVertices);
  const subAreas = useAppStore(state => state.subAreas);
  const setSubAreas = useAppStore(state => state.setSubAreas);
  const selectedVertexIndices = useAppStore(state => state.selectedVertexIndices);
  const setSelectedVertexIndices = useAppStore(state => state.setSelectedVertexIndices);
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveSubAreaId = useAppStore(state => state.setActiveSubAreaId);
  const setActiveWallExtensionId = useAppStore(state => state.setActiveWallExtensionId);
  const activeSubAreaId = useAppStore(state => state.activeSubAreaId);
  const foldLines = useAppStore(state => state.foldLines);
  const setFoldLines = useAppStore(state => state.setFoldLines);
  const draftFoldNodeIndex = useAppStore(state => state.draftFoldNodeIndex);
  const setDraftFoldNodeIndex = useAppStore(state => state.setDraftFoldNodeIndex);
  const stitches = useAppStore(state => state.stitches);
  const setStitches = useAppStore(state => state.setStitches);

  const [editingAngleIndex, setEditingAngleIndex] = useState<number | null>(null);
  const [editingAngleSubAreaId, setEditingAngleSubAreaId] = useState<string | null>(null);
  const [angleInputValue, setAngleInputValue] = useState<string>('');

  const [lengthInputValue, setLengthInputValue] = useState<string>('');

  const [editingRiseIndex, setEditingRiseIndex] = useState<number | null>(null);
  const [editingRiseSubAreaId, setEditingRiseSubAreaId] = useState<string | null>(null);
  const [riseInputValue, setRiseInputValue] = useState<string>('');

  const handleDeleteWallVertex = (index: number) => {
    if (!wallVertices || wallVertices.length <= 3) {
      alert('Wall must have at least 3 points');
      return;
    }

    const newVertices = [...wallVertices];
    newVertices.splice(index, 1);

    if (
      !isPolygonSelfIntersecting(getTessellatedPath(newVertices)) &&
      newVertices.length >= 3
    ) {
      // 1. Remove any fold lines attached to the deleted node
      const survivingFolds = foldLines.filter(
        (f) => f.startNodeIndex !== index && f.endNodeIndex !== index
      );
      // 2. Shift the indices of the remaining fold lines down by 1 if they were after the deleted node
      const shiftedFolds = survivingFolds.map((f) => ({
        ...f,
        startNodeIndex: f.startNodeIndex > index ? f.startNodeIndex - 1 : f.startNodeIndex,
        endNodeIndex: f.endNodeIndex > index ? f.endNodeIndex - 1 : f.endNodeIndex,
      }));
      setFoldLines(shiftedFolds);

      // Remove and shift stitches attached to deleted node
      const survivingStitches = stitches.filter(
        s => s.nodeAIndex !== index && s.nodeBIndex !== index
      );
      const shiftedStitches = survivingStitches.map(s => ({
        ...s,
        nodeAIndex: s.nodeAIndex > index ? s.nodeAIndex - 1 : s.nodeAIndex,
        nodeBIndex: s.nodeBIndex > index ? s.nodeBIndex - 1 : s.nodeBIndex
      }));
      setStitches(shiftedStitches);

      setWallVertices(newVertices);
    } else {
      alert('Cannot delete vertex: resulting wall would self-intersect.');
    }
  };

  const handleToggleWallAngleConstraint = (index: number, currentAngle: number) => {
    if (!wallVertices) return;
    const newVertices = [...wallVertices];
    const node = newVertices[index] as any;
    if (node.isAngleLocked) {
       node.isAngleLocked = false;
       node.lockedAngleValue = null;
    } else {
       node.isAngleLocked = true;
       node.lockedAngleValue = currentAngle;
    }
    setWallVertices(newVertices);
  };

  const handleToggleWallLengthConstraint = (index: number, currentLen: number) => {
    if (!wallVertices) return;
    const newV = [...wallVertices];
    const node = { ...newV[index] } as any;
    if (node.isLengthLocked) {
      node.isLengthLocked = false;
      node.lockedLengthValue = null;
    } else {
      node.isLengthLocked = true;
      node.lockedLengthValue = currentLen;
    }
    newV[index] = node;
    setWallVertices(newV);
  };

  const handleDoubleClickDeleteWallCurveNode = (index: number) => {
    if (!wallVertices) return;

    const newVertices = [...wallVertices];
    newVertices.splice(index, 1);

    if (
      !isPolygonSelfIntersecting(getTessellatedPath(newVertices)) &&
      newVertices.length >= 3
    ) {
      // 1. Remove any fold lines attached to the deleted node
      const survivingFolds = foldLines.filter(
        (f) => f.startNodeIndex !== index && f.endNodeIndex !== index
      );
      // 2. Shift the indices of the remaining fold lines down by 1 if they were after the deleted node
      const shiftedFolds = survivingFolds.map((f) => ({
        ...f,
        startNodeIndex: f.startNodeIndex > index ? f.startNodeIndex - 1 : f.startNodeIndex,
        endNodeIndex: f.endNodeIndex > index ? f.endNodeIndex - 1 : f.endNodeIndex,
      }));
      setFoldLines(shiftedFolds);

      // Remove and shift stitches attached to deleted node
      const survivingStitches = stitches.filter(
        s => s.nodeAIndex !== index && s.nodeBIndex !== index
      );
      const shiftedStitches = survivingStitches.map(s => ({
        ...s,
        nodeAIndex: s.nodeAIndex > index ? s.nodeAIndex - 1 : s.nodeAIndex,
        nodeBIndex: s.nodeBIndex > index ? s.nodeBIndex - 1 : s.nodeBIndex
      }));
      setStitches(shiftedStitches);

      setWallVertices(newVertices);
    }
  };

  const handleWallVertexClick = (index: number, isCurveNode: boolean, currentAngle: number, currentRiseStr: string) => {
    if (!isCurveNode) {
      setEditingAngleIndex(index);
      setEditingAngleSubAreaId(null);
      setAngleInputValue(formatVisualAngle(currentAngle));
    } else {
      setEditingRiseIndex(index);
      setEditingRiseSubAreaId(null);
      setRiseInputValue(currentRiseStr);
    }
  };

  const handleWallVertexMouseDown = (index: number, setDraggingVertexIndex: (idx: number | null) => void) => {
    if (editingAngleIndex !== null) handleAngleSubmit();

    if (activeTool === 'select') {
      if (!selectedVertexIndices.includes(index)) {
        setSelectedVertexIndices([]);
      }
      setDraggingVertexIndex(index);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
    }
  };

  const handleDeleteSubAreaVertex = (subAreaId: string, index: number) => {
    const activeSa = subAreas.find((sa) => sa.id === subAreaId);
    if (!activeSa) return;
    const saVertices = getSubAreaVertices(activeSa);
    if (saVertices.length <= 3) {
      alert('Accent panel must have at least 3 points');
      return;
    }
    const newVertices = [...saVertices];
    newVertices.splice(index, 1);
    setSubAreas(
      subAreas.map((s) => {
        if (s.id === subAreaId) {
          const xs = newVertices.map((v) => v.x);
          const ys = newVertices.map((v) => v.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          return {
            ...s,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            vertices: newVertices,
          };
        }
        return s;
      })
    );
  };

  const handleToggleSubAreaAngleConstraint = (subAreaId: string, index: number, currentAngle: number) => {
    const activeSa = subAreas.find((sa) => sa.id === subAreaId);
    if (!activeSa) return;
    const saVertices = getSubAreaVertices(activeSa);
    const newVertices = [...saVertices];
    const node = newVertices[index] as any;
    if (node.isAngleLocked) {
      node.isAngleLocked = false;
      node.lockedAngleValue = null;
    } else {
      node.isAngleLocked = true;
      node.lockedAngleValue = currentAngle;
    }
    setSubAreas(
      subAreas.map((s) => {
        if (s.id === subAreaId) {
          return {
            ...s,
            vertices: newVertices,
          };
        }
         return s;
      })
    );
  };

  const handleToggleSubAreaLengthConstraint = (subAreaId: string, index: number, currentLen: number) => {
    const activeSa = subAreas.find((sa) => sa.id === subAreaId);
    if (!activeSa) return;
    const saVertices = getSubAreaVertices(activeSa);
    const newVertices = [...saVertices];
    const node = { ...newVertices[index] } as any;
    if (node.isLengthLocked) {
      node.isLengthLocked = false;
      node.lockedLengthValue = null;
    } else {
      node.isLengthLocked = true;
      node.lockedLengthValue = currentLen;
    }
    newVertices[index] = node;
    setSubAreas(
      subAreas.map((s) => {
        if (s.id === subAreaId) {
          return {
            ...s,
            vertices: newVertices,
          };
        }
        return s;
      })
    );
  };

  const handleDoubleClickDeleteSubAreaCurveNode = (subAreaId: string, index: number) => {
    const activeSa = subAreas.find((sa) => sa.id === subAreaId);
    if (!activeSa) return;
    const saVertices = getSubAreaVertices(activeSa);
    const newVertices = [...saVertices];
    newVertices.splice(index, 1);
    setSubAreas(
      subAreas.map((s) => {
        if (s.id === subAreaId) {
          const xs = newVertices.map((v) => v.x);
          const ys = newVertices.map((v) => v.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          return {
            ...s,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            vertices: newVertices,
          };
        }
        return s;
      })
    );
  };

  const handleSubAreaVertexClick = (subAreaId: string, index: number, isCurveNode: boolean, currentAngle: number, currentRiseStr: string) => {
    if (!isCurveNode) {
      setEditingAngleIndex(index);
      setEditingAngleSubAreaId(subAreaId);
      setAngleInputValue(formatVisualAngle(currentAngle));
    } else {
      setEditingRiseIndex(index);
      setEditingRiseSubAreaId(subAreaId);
      setRiseInputValue(currentRiseStr);
    }
  };

  const handleSubAreaVertexMouseDown = (index: number, setDraggingSubAreaVertexIndex: (idx: number | null) => void) => {
    if (editingAngleIndex !== null) handleAngleSubmit();
    if (activeTool === 'select') {
      setSelectedVertexIndices([]);
      setDraggingSubAreaVertexIndex(index);
    }
  };

  useEffect(() => {
    if (editingLengthIndex !== null) {
      if (editingLengthSubAreaId) {
        const activeSa = subAreas.find((s) => s.id === editingLengthSubAreaId);
        if (activeSa) {
          const saVertices = getSubAreaVertices(activeSa);
          const n = saVertices.length;
          const indexA = editingLengthIndex;
          const indexB = (indexA + 1) % n;
          const A = saVertices[indexA];
          const B = saVertices[indexB];
          if (A && B) {
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            setLengthInputValue(len.toFixed(2));
          }
        }
      } else if (wallVertices && wallVertices[editingLengthIndex]) {
        const n = wallVertices.length;
        const indexA = editingLengthIndex;
        const indexB = (indexA + 1) % n;
        const A = wallVertices[indexA];
        const B = wallVertices[indexB];
        if (A && B) {
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          setLengthInputValue(len.toFixed(2));
        }
      }
    }
  }, [editingLengthIndex, editingLengthSubAreaId, wallVertices, subAreas]);

  const getSubAreaVertices = (sa: SubArea) => {
    if (sa.vertices && sa.vertices.length >= 3) {
      return sa.vertices;
    }
    return [
      { x: sa.x, y: sa.y },
      { x: sa.x + sa.width, y: sa.y },
      { x: sa.x + sa.width, y: sa.y + sa.height },
      { x: sa.x, y: sa.y + sa.height },
    ];
  };

  const handleLengthSubmit = (customIndex?: number | null, customValue?: string) => {
    const targetIndex = customIndex !== undefined ? customIndex : editingLengthIndex;
    const targetValue = customValue !== undefined ? customValue : lengthInputValue;

    if (targetIndex === null) {
      setEditingLengthIndex(null);
      setEditingLengthSubAreaId(null);
      return;
    }

    if (editingLengthSubAreaId) {
      const activeSa = subAreas.find((s) => s.id === editingLengthSubAreaId);
      if (activeSa && !activeSa.locked) {
        const saVertices = getSubAreaVertices(activeSa);
        const newLength = parseFloat(targetValue);
        if (!isNaN(newLength) && newLength > 0) {
          const n = saVertices.length;
          const indexA = targetIndex;
          const indexB = (indexA + 1) % n;

          const A = saVertices[indexA] as any;
          const B = saVertices[indexB] as any;

          if (!A.isCurveNode && !B.isCurveNode) {
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const currentLength = Math.sqrt(dx * dx + dy * dy);

            if (currentLength > 0) {
              const lengthDiff = newLength - currentLength;
              const unitX = dx / currentLength;
              const unitY = dy / currentLength;

              const deltaX = unitX * lengthDiff;
              const deltaY = unitY * lengthDiff;

              const updatedVertices = [...saVertices];

              const isBFixed = B.isAngleLocked || B.isLengthLocked;
              const isAFixed = A.isAngleLocked || (saVertices[(indexA - 1 + n) % n] as any).isLengthLocked;

              let movingNodeIndex: number;
              let fixedAnchorIndex: number;
              let shiftX: number;
              let shiftY: number;
              let step: number;

              if (isBFixed && !isAFixed) {
                movingNodeIndex = indexA;
                fixedAnchorIndex = indexB;
                shiftX = -deltaX;
                shiftY = -deltaY;
                step = -1;
              } else {
                movingNodeIndex = indexB;
                fixedAnchorIndex = indexA;
                shiftX = deltaX;
                shiftY = deltaY;
                step = 1;
              }

              // Apply delta to primary moving node
              const primaryMovingNode = saVertices[movingNodeIndex] as any;
              updatedVertices[movingNodeIndex] = {
                ...primaryMovingNode,
                x: primaryMovingNode.x + shiftX,
                y: primaryMovingNode.y + shiftY,
              };

              // Orthogonal Propagator (Rigid-Body Push)
              let currNodeIndex = movingNodeIndex;
              while (true) {
                const nextNodeIndex = (currNodeIndex + step + n) % n;
                if (nextNodeIndex === fixedAnchorIndex) break;

                const pStart = saVertices[fixedAnchorIndex];
                const pEnd = saVertices[movingNodeIndex];
                const segNextStart = saVertices[currNodeIndex];
                const segNextEnd = saVertices[nextNodeIndex];

                const angleDiff = getAngleBetweenSegments(pStart, pEnd, segNextStart, segNextEnd);

                const isOrthogonal = Math.abs(angleDiff - 90) < 1 || Math.abs(angleDiff - 270) < 1;
                if (!isOrthogonal) break;

                const nextNode = saVertices[nextNodeIndex] as any;
                updatedVertices[nextNodeIndex] = {
                  ...nextNode,
                  x: nextNode.x + shiftX,
                  y: nextNode.y + shiftY,
                };

                currNodeIndex = nextNodeIndex;
              }

              for (let i = 0; i < n; i++) {
                const curr = updatedVertices[i] as any;
                if (curr.isLengthLocked) {
                  const next = updatedVertices[(i + 1) % n];
                  const d = Math.sqrt(Math.pow(next.x - curr.x, 2) + Math.pow(next.y - curr.y, 2));
                  curr.lockedLengthValue = d;
                }
              }

              if (!isPolygonSelfIntersecting(getTessellatedPath(updatedVertices))) {
                const xs = updatedVertices.map((v) => v.x);
                const ys = updatedVertices.map((v) => v.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                setSubAreas(
                  subAreas.map((sa) => {
                    if (sa.id === editingLengthSubAreaId) {
                      return {
                        ...sa,
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                        vertices: updatedVertices,
                      };
                    }
                    return sa;
                  })
                );
              }
            }
          }
        }
      }
      setEditingLengthIndex(null);
      setEditingLengthSubAreaId(null);
      setEditingAngleIndex(null);
      return;
    }

    if (!wallVertices) {
      setEditingLengthIndex(null);
      return;
    }

    const L = parseFloat(targetValue);
    if (!isNaN(L) && L > 0) {
      const n = wallVertices.length;
      const indexA = targetIndex;
      const indexB = (indexA + 1) % n;

      const A = wallVertices[indexA] as any;
      const B = wallVertices[indexB] as any;

      if (!A.isCurveNode && !B.isCurveNode) {
        let dx = B.x - A.x;
        let dy = B.y - A.y;
        const currentLen = Math.sqrt(dx * dx + dy * dy);

        if (currentLen > 0) {
          const deltaL = L - currentLen;
          const dirX = dx / currentLen;
          const dirY = dy / currentLen;

          const moveDx = dirX * deltaL;
          const moveDy = dirY * deltaL;

          const updatedVertices = [...wallVertices];

          const isASelected = selectedVertexIndices.includes(indexA);
          const isBSelected = selectedVertexIndices.includes(indexB);
          const isGroup = selectedVertexIndices.length > 1;

          if (isGroup && isBSelected && !isASelected) {
            selectedVertexIndices.forEach(idx => {
              updatedVertices[idx] = { ...updatedVertices[idx], x: updatedVertices[idx].x + moveDx, y: updatedVertices[idx].y + moveDy };
            });
          } else if (isGroup && isASelected && !isBSelected) {
            selectedVertexIndices.forEach(idx => {
              updatedVertices[idx] = { ...updatedVertices[idx], x: updatedVertices[idx].x - moveDx, y: updatedVertices[idx].y - moveDy };
            });
          } else {
            const anchorIndex = 0;
            let fixedEndIndex = indexA;
            let freeEndIndex = indexB;
            let step = 1;

            if (indexB === anchorIndex) {
              fixedEndIndex = indexB;
              freeEndIndex = indexA;
              step = -1;
            }

            const refA = wallVertices[fixedEndIndex] as any;
            const refB = wallVertices[freeEndIndex] as any;

            const dxSegment = refB.x - refA.x;
            const dySegment = refB.y - refA.y;
            const segLen = Math.sqrt(dxSegment * dxSegment + dySegment * dySegment);

            if (segLen > 1e-6) {
              const dL = L - segLen;
              const u_x = dxSegment / segLen;
              const u_y = dySegment / segLen;

              const deltaX = u_x * dL;
              const deltaY = u_y * dL;

              // Move free-end node by the displacement (Delta)
              updatedVertices[freeEndIndex] = {
                ...updatedVertices[freeEndIndex],
                x: updatedVertices[freeEndIndex].x + deltaX,
                y: updatedVertices[freeEndIndex].y + deltaY,
              };

              // Walk the connected chain starting from this free-end node, moving away from edited segment
              let currNodeIndex = freeEndIndex;
              while (true) {
                const nextNodeIndex = (currNodeIndex + step + n) % n;
                if (nextNodeIndex === anchorIndex) {
                  // Stop before translating the absolute anchor node
                  break;
                }

                // Check angle constraint at the corner we are leaving
                const isAngleLocked = (wallVertices[currNodeIndex] as any).isAngleLocked;
                if (isAngleLocked) {
                  // Translate adjacent node by the same exact delta vector to preserve orientation and length
                  updatedVertices[nextNodeIndex] = {
                    ...updatedVertices[nextNodeIndex],
                    x: updatedVertices[nextNodeIndex].x + deltaX,
                    y: updatedVertices[nextNodeIndex].y + deltaY,
                  };
                  currNodeIndex = nextNodeIndex;
                } else {
                  // Stopped by hit of unlocked angle
                  break;
                }
              }
            }
          }

          for (let i = 0; i < n; i++) {
            const curr = updatedVertices[i] as any;
            if (curr.isLengthLocked) {
              const next = updatedVertices[(i + 1) % n];
              const d = Math.sqrt(Math.pow(next.x - curr.x, 2) + Math.pow(next.y - curr.y, 2));
              curr.lockedLengthValue = d;
            }
          }

          if (!isPolygonSelfIntersecting(getTessellatedPath(updatedVertices))) {
            setWallVertices(updatedVertices);
          }
        }
      }
    }
    setEditingLengthIndex(null);
    setEditingAngleIndex(null);
  };

  const handleRiseSubmit = () => {
    if (editingRiseIndex === null) return;
    
    const newRise = parseFloat(riseInputValue);
    if (isNaN(newRise) || newRise < 0) {
      setEditingRiseIndex(null);
      setEditingRiseSubAreaId(null);
      return;
    }

    if (editingRiseSubAreaId && subAreas) {
      const activeSa = subAreas.find((s) => s.id === editingRiseSubAreaId);
      if (activeSa && !activeSa.locked) {
        const saVertices = getSubAreaVertices(activeSa);
        const indexB = editingRiseIndex;
        const n = saVertices.length;
        const indexA = (indexB - 1 + n) % n;
        const indexC = (indexB + 1) % n;
        
        const A = saVertices[indexA] as any;
        const C = saVertices[indexC] as any;
        const B = saVertices[indexB] as any;

        let dx = C.x - A.x;
        let dy = C.y - A.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          dx /= len;
          dy /= len;
        }
        const perpX = -dy;
        const perpY = dx;
        const midX = (A.x + C.x) / 2;
        const midY = (A.y + C.y) / 2;

        let currentDot = (B.x - midX) * perpX + (B.y - midY) * perpY;
        const isNegative = currentDot < 0;
        
        const updatedVertices = [...saVertices];
        const finalRise = isNegative ? -newRise : newRise;
        updatedVertices[indexB] = {
           ...B,
           x: midX + perpX * finalRise,
           y: midY + perpY * finalRise
        };

        if (!isPolygonSelfIntersecting(getTessellatedPath(updatedVertices))) {
          const xs = updatedVertices.map((v) => v.x);
          const ys = updatedVertices.map((v) => v.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          setSubAreas(
            subAreas.map((sa) => {
              if (sa.id === editingRiseSubAreaId) {
                return {
                  ...sa,
                  x: minX,
                  y: minY,
                  width: maxX - minX,
                  height: maxY - minY,
                  vertices: updatedVertices,
                };
              }
              return sa;
            })
          );
        }
      }
      setEditingRiseIndex(null);
      setEditingRiseSubAreaId(null);
      return;
    }

    if (!wallVertices) return;

    const n = wallVertices.length;
    const indexB = editingRiseIndex;
    const indexA = (indexB - 1 + n) % n;
    const indexC = (indexB + 1) % n;
    
    const A = wallVertices[indexA] as any;
    const C = wallVertices[indexC] as any;
    const B = wallVertices[indexB] as any;

    let dx = C.x - A.x;
    let dy = C.y - A.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }
    const perpX = -dy;
    const perpY = dx;
    const midX = (A.x + C.x) / 2;
    const midY = (A.y + C.y) / 2;

    let currentDot = (B.x - midX) * perpX + (B.y - midY) * perpY;
    const isNegative = currentDot < 0;
        
    const updatedVertices = [...wallVertices];
    const finalRise = isNegative ? -newRise : newRise;
    updatedVertices[indexB] = {
       ...B,
       x: midX + perpX * finalRise,
       y: midY + perpY * finalRise
    };

    if (!isPolygonSelfIntersecting(getTessellatedPath(updatedVertices))) {
      setWallVertices(updatedVertices);
    }
    setEditingRiseIndex(null);
  };

  const handleAngleSubmit = () => {
    if (editingAngleIndex === null) return;

    if (editingAngleSubAreaId) {
      const activeSa = subAreas.find((sa) => sa.id === editingAngleSubAreaId);
      if (activeSa && !activeSa.locked) {
        const saVertices = getSubAreaVertices(activeSa);
        const newAngle = parseFloat(angleInputValue);
        if (!isNaN(newAngle) && newAngle > 0 && newAngle < 360) {
          const n = saVertices.length;
          const indexB = editingAngleIndex;
          const indexA = (indexB - 1 + n) % n;
          const indexC = (indexB + 1) % n;

          const A = saVertices[indexA] as any;
          const B = saVertices[indexB] as any;
          const C = saVertices[indexC] as any;

          const isCCW = getSignedArea(saVertices) >= 0;

          const isALocked = A.isAngleLocked && !A.isCurveNode;
          const isCLocked = C.isAngleLocked && !C.isCurveNode;

          const updatedVertices = [...saVertices];
          const internalRad = (newAngle * Math.PI) / 180;

          if (isALocked && !isCLocked) {
            const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
            const newAngleBC = isCCW ? angleBA - internalRad : angleBA + internalRad;
            const lenBC = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));
            updatedVertices[indexC] = {
              ...C,
              x: B.x + lenBC * Math.cos(newAngleBC),
              y: B.y + lenBC * Math.sin(newAngleBC),
            };
          } else if (isCLocked && !isALocked) {
            const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
            const newAngleBA = isCCW ? angleBC + internalRad : angleBC - internalRad;
            const lenBA = Math.sqrt(Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2));
            updatedVertices[indexA] = {
              ...A,
              x: B.x + lenBA * Math.cos(newAngleBA),
              y: B.y + lenBA * Math.sin(newAngleBA),
            };
          } else if (!isALocked && !isCLocked) {
            const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
            const newAngleBC = isCCW ? angleBA - internalRad : angleBA + internalRad;
            const lenBC = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));
            updatedVertices[indexC] = {
              ...C,
              x: B.x + lenBC * Math.cos(newAngleBC),
              y: B.y + lenBC * Math.sin(newAngleBC),
            };
          }

          const updateLockedState = (idx: number) => {
            const node = updatedVertices[idx] as any;
            if (node.isAngleLocked && !node.isCurveNode) {
              const prev = updatedVertices[(idx - 1 + n) % n];
              const next = updatedVertices[(idx + 1) % n];
              node.lockedAngleValue = getInternalAngle(prev, node, next, isCCW);
            }
          };
          for (let idx = 0; idx < n; idx++) {
            updateLockedState(idx);
          }

          if (!isPolygonSelfIntersecting(getTessellatedPath(updatedVertices))) {
            const xs = updatedVertices.map((v) => v.x);
            const ys = updatedVertices.map((v) => v.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            setSubAreas(
              subAreas.map((sa) => {
                if (sa.id === editingAngleSubAreaId) {
                  return {
                    ...sa,
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    vertices: updatedVertices,
                  };
                }
                return sa;
              })
            );
          }
        }
      }
      setEditingAngleIndex(null);
      setEditingAngleSubAreaId(null);
      return;
    }

    if (!wallVertices) return;

    const newAngle = parseFloat(angleInputValue);
    if (!isNaN(newAngle) && newAngle > 0 && newAngle < 360) {
      const n = wallVertices.length;
      const indexB = editingAngleIndex;
      const indexA = (indexB - 1 + n) % n;
      const indexC = (indexB + 1) % n;

      const A = wallVertices[indexA] as any;
      const B = wallVertices[indexB] as any;
      const C = wallVertices[indexC] as any;

      const isCCW = getSignedArea(wallVertices) >= 0;

      const isALocked = A.isAngleLocked && !A.isCurveNode;
      const isCLocked = C.isAngleLocked && !C.isCurveNode;

      const updatedVertices = [...wallVertices];
      const internalRad = (newAngle * Math.PI) / 180;

      if (isALocked && !isCLocked) {
        const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
        const newAngleBC = isCCW ? angleBA - internalRad : angleBA + internalRad;
        const lenBC = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));
        updatedVertices[indexC] = {
          ...C,
          x: B.x + lenBC * Math.cos(newAngleBC),
          y: B.y + lenBC * Math.sin(newAngleBC),
        };
      } else if (isCLocked && !isALocked) {
        const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
        const newAngleBA = isCCW ? angleBC + internalRad : angleBC - internalRad;
        const lenBA = Math.sqrt(Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2));
        updatedVertices[indexA] = {
          ...A,
          x: B.x + lenBA * Math.cos(newAngleBA),
          y: B.y + lenBA * Math.sin(newAngleBA),
        };
      } else if (!isALocked && !isCLocked) {
        const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
        const newAngleBC = isCCW ? angleBA - internalRad : angleBA + internalRad;
        const lenBC = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));
        updatedVertices[indexC] = {
          ...C,
          x: B.x + lenBC * Math.cos(newAngleBC),
          y: B.y + lenBC * Math.sin(newAngleBC),
        };
      }

      const updateLockedState = (idx: number) => {
        const node = updatedVertices[idx] as any;
        if (node.isAngleLocked && !node.isCurveNode) {
          const prev = updatedVertices[(idx - 1 + n) % n];
          const next = updatedVertices[(idx + 1) % n];
          node.lockedAngleValue = getInternalAngle(prev, node, next, isCCW);
        }
      };
      for (let idx = 0; idx < n; idx++) {
        updateLockedState(idx);
      }

      if (!isPolygonSelfIntersecting(getTessellatedPath(updatedVertices))) {
        setWallVertices(updatedVertices);
      }
    }
    setEditingAngleIndex(null);
    setEditingAngleSubAreaId(null);
  };

  return {
    editingAngleIndex,
    setEditingAngleIndex,
    editingAngleSubAreaId,
    setEditingAngleSubAreaId,
    angleInputValue,
    setAngleInputValue,
    lengthInputValue,
    setLengthInputValue,
    editingRiseIndex,
    setEditingRiseIndex,
    editingRiseSubAreaId,
    setEditingRiseSubAreaId,
    riseInputValue,
    setRiseInputValue,
    getSubAreaVertices,
    handleLengthSubmit,
    handleRiseSubmit,
    handleAngleSubmit,

    // Store read only states/selectors
    wallVertices,
    subAreas,
    activeSubAreaId,
    activeTool,
    selectedVertexIndices,
    foldLines,
    setFoldLines,
    draftFoldNodeIndex,
    setDraftFoldNodeIndex,

    // Wall Interactivity
    handleDeleteWallVertex,
    handleToggleWallAngleConstraint,
    handleToggleWallLengthConstraint,
    handleDoubleClickDeleteWallCurveNode,
    handleWallVertexClick,
    handleWallVertexMouseDown,

    // Subarea Interactivity
    handleDeleteSubAreaVertex,
    handleToggleSubAreaAngleConstraint,
    handleToggleSubAreaLengthConstraint,
    handleDoubleClickDeleteSubAreaCurveNode,
    handleSubAreaVertexClick,
    handleSubAreaVertexMouseDown,
  };
}
