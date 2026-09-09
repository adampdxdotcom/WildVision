const fs = require('fs');
const path = 'src/components/TileCanvas3D/useDragController.ts';
let code = fs.readFileSync(path, 'utf8');

const oldXContainment = `        // X containment
        if (planeKey === 'back' || planeKey === 'floor' || planeKey === 'ceiling') {
          const sizeX = offsetXMax - offsetXMin;
          if (sizeX <= roomDimensions.width) {
            if (xInch + offsetXMin < leftWallX) {
              xInch = leftWallX - offsetXMin;
            } else if (xInch + offsetXMax > rightWallX) {
              xInch = rightWallX - offsetXMax;
            }
          } else {
            // Allows movement inward toward the center if it ever exceeds room boundaries rather than freezing
            xInch = Math.max(leftWallX, Math.min(rightWallX, xInch));
          }
        }`;

const newXContainment = `        // X containment
        if (planeKey === 'back' || planeKey === 'floor' || planeKey === 'ceiling') {
          const sizeX = offsetXMax - offsetXMin;
          if (sizeX <= roomDimensions.width) {
            const distLeft = (xInch + offsetXMin) - leftWallX;
            const distRight = rightWallX - (xInch + offsetXMax);
            if (distLeft < 6 && distLeft <= distRight) {
              xInch = leftWallX - offsetXMin;
            } else if (distRight < 6) {
              xInch = rightWallX - offsetXMax;
            }
          } else {
            xInch = Math.max(leftWallX, Math.min(rightWallX, xInch));
          }
        }`;

const oldZContainment = `        // Z containment
        if (planeKey === 'left' || planeKey === 'right' || planeKey === 'floor' || planeKey === 'ceiling') {
          const sizeZ = offsetZMax - offsetZMin;
          if (sizeZ <= roomDimensions.depth) {
            if (zInch + offsetZMin < backWallZ) {
              zInch = backWallZ - offsetZMin;
            } else if (zInch + offsetZMax > frontWallZ) {
              zInch = frontWallZ - offsetZMax;
            }
          } else {
            // Allows movement inward toward the center rather than freezing
            zInch = Math.max(backWallZ, Math.min(frontWallZ, zInch));
          }
        }`;

const newZContainment = `        // Z containment
        if (planeKey === 'left' || planeKey === 'right' || planeKey === 'floor' || planeKey === 'ceiling') {
          const sizeZ = offsetZMax - offsetZMin;
          if (sizeZ <= roomDimensions.depth) {
            const distBack = (zInch + offsetZMin) - backWallZ;
            const distFront = frontWallZ - (zInch + offsetZMax);
            if (distBack < 6 && distBack <= distFront) {
              zInch = backWallZ - offsetZMin;
            } else if (distFront < 6) {
              zInch = frontWallZ - offsetZMax;
            }
          } else {
            zInch = Math.max(backWallZ, Math.min(frontWallZ, zInch));
          }
        }`;

const oldYContainment = `        // Y containment
        const sizeY = offsetYMax - offsetYMin;
        if (sizeY <= roomDimensions.height) {
          if (yInch + offsetYMin < floorYVal) {
            yInch = floorYVal - offsetYMin;
          } else if (yInch + offsetYMax > ceilingYVal) {
            yInch = ceilingYVal - offsetYMax;
          }
        } else {
          yInch = Math.max(floorYVal, Math.min(ceilingYVal, yInch));
        }`;

const newYContainment = `        // Y containment
        const sizeY = offsetYMax - offsetYMin;
        if (sizeY <= roomDimensions.height) {
          const distFloor = (yInch + offsetYMin) - floorYVal;
          const distCeil = ceilingYVal - (yInch + offsetYMax);
          if (distFloor < 6 && distFloor <= distCeil) {
            yInch = floorYVal - offsetYMin;
          } else if (distCeil < 6) {
            yInch = ceilingYVal - offsetYMax;
          }
        } else {
          yInch = Math.max(floorYVal, Math.min(ceilingYVal, yInch));
        }`;

const oldFallbackX = `        if (planeKey === 'back' || planeKey === 'floor' || planeKey === 'ceiling') {
          if (minGlobalX < leftWallX) {
            xInch += (leftWallX - minGlobalX);
          }
          if (maxGlobalX > rightWallX) {
            xInch += (rightWallX - maxGlobalX);
          }
        }`;

const newFallbackX = `        if (planeKey === 'back' || planeKey === 'floor' || planeKey === 'ceiling') {
          const distLeft = minGlobalX - leftWallX;
          const distRight = rightWallX - maxGlobalX;
          if (distLeft < 6 && distLeft <= distRight) {
            xInch += (leftWallX - minGlobalX);
          } else if (distRight < 6) {
            xInch += (rightWallX - maxGlobalX);
          }
        }`;

const oldFallbackZ = `        if (planeKey === 'left' || planeKey === 'right' || planeKey === 'floor' || planeKey === 'ceiling') {
          if (minGlobalZ < backWallZ) {
            zInch += (backWallZ - minGlobalZ);
          }
          if (maxGlobalZ > frontWallZ) {
            zInch += (frontWallZ - maxGlobalZ);
          }
        }`;

const newFallbackZ = `        if (planeKey === 'left' || planeKey === 'right' || planeKey === 'floor' || planeKey === 'ceiling') {
          const distBack = minGlobalZ - backWallZ;
          const distFront = frontWallZ - maxGlobalZ;
          if (distBack < 6 && distBack <= distFront) {
            zInch += (backWallZ - minGlobalZ);
          } else if (distFront < 6) {
            zInch += (frontWallZ - maxGlobalZ);
          }
        }`;

const oldFallbackY = `        const minY = -roomDimensions.height / 2 + bounds.height / 2;
        const maxY = roomDimensions.height / 2 - bounds.height / 2;
        yInch = Math.max(minY, Math.min(maxY, yInch));`;

const newFallbackY = `        const minY = -roomDimensions.height / 2 + bounds.height / 2;
        const maxY = roomDimensions.height / 2 - bounds.height / 2;
        const distFloor = yInch - minY;
        const distCeil = maxY - yInch;
        if (distFloor < 6 && distFloor <= distCeil) {
          yInch = minY;
        } else if (distCeil < 6) {
          yInch = maxY;
        } else {
          yInch = Math.max(minY, Math.min(maxY, yInch));
        }`;

code = code.replace(oldXContainment, newXContainment);
code = code.replace(oldZContainment, newZContainment);
code = code.replace(oldYContainment, newYContainment);
code = code.replace(oldFallbackX, newFallbackX);
code = code.replace(oldFallbackZ, newFallbackZ);
code = code.replace(oldFallbackY, newFallbackY);

fs.writeFileSync(path, code);
