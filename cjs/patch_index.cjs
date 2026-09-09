const fs = require('fs');

const path = 'src/components/TileCanvas3D/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const anchorRegex = /(const anchor = layoutTransform\.mountAnchor \|\| 'back';\s+const isRecessed = anchor === 'back';\s+const attachedPlane = layoutTransform\.attachedPlane;)/g;

const anchorReplace = `$1

    const holeConfigByPlane: Record<string, {xLeft: number, xRight: number, yBottom: number, yTop: number}[]> = {
       back: [], left: [], right: [], floor: [], ceiling: []
    };

    if (d3Columns && d3Columns.length > 0 && subAreas && subAreas.length > 0) {
      const layoutObj = new THREE.Object3D();
      const px = to3D(-(roomDimensions.width / 2) + layoutTransform.position[0]);
      const py = to3D(-(roomDimensions.height / 2) + layoutTransform.position[1]);
      const pz = to3D(layoutTransform.position[2]);
      layoutObj.position.set(px, py, pz);
      
      switch (attachedPlane) {
        case 'left': layoutObj.rotation.set(0, Math.PI / 2, 0); break;
        case 'right': layoutObj.rotation.set(0, -Math.PI / 2, 0); break;
        case 'floor': layoutObj.rotation.set(-Math.PI / 2, 0, 0); break;
        case 'ceiling': layoutObj.rotation.set(Math.PI / 2, 0, 0); break;
        case 'back': default: break;
      }

      let rootIdx = 0;
      let maxWidth = 0;
      d3Columns.forEach((col, i) => { if (col.width > maxWidth) { maxWidth = col.width; rootIdx = i; } });
      const rootCol = d3Columns[rootIdx];

      let maxOutward = 0; let maxInward = 0;
      if (rootCol) {
        if (rootCol.topFlaps && rootCol.topFlaps.length > 0) { const fa = rootCol.topFlaps[0].foldAngle ?? 90; if (fa < 0) maxOutward = Math.max(maxOutward, rootCol.topFlaps[0].d3Height); else maxInward = Math.max(maxInward, rootCol.topFlaps[0].d3Height); }
        if (rootCol.bottomFlaps && rootCol.bottomFlaps.length > 0) { const fa = rootCol.bottomFlaps[0].foldAngle ?? 90; if (fa < 0) maxOutward = Math.max(maxOutward, rootCol.bottomFlaps[0].d3Height); else maxInward = Math.max(maxInward, rootCol.bottomFlaps[0].d3Height); }
      }
      if (d3Columns[rootIdx - 1]) { const fa = d3Columns[rootIdx - 1].rightFoldAngle ?? d3Columns[rootIdx - 1].foldAngle ?? 90; if (fa < 0) maxOutward = Math.max(maxOutward, d3Columns[rootIdx - 1].d3Width); else maxInward = Math.max(maxInward, d3Columns[rootIdx - 1].d3Width); }
      if (d3Columns[rootIdx + 1]) { const fa = d3Columns[rootIdx + 1].foldAngle ?? 90; if (fa < 0) maxOutward = Math.max(maxOutward, d3Columns[rootIdx + 1].d3Width); else maxInward = Math.max(maxInward, d3Columns[rootIdx + 1].d3Width); }

      let localZOffset = 0;
      if (maxOutward > 0) { if (anchor === 'back') localZOffset = maxOutward; else if (anchor === 'center') localZOffset = maxOutward / 2; }
      else if (maxInward > 0) { if (anchor === 'back') localZOffset = -maxInward / 2; }

      const zOffsetGroup = new THREE.Object3D();
      zOffsetGroup.position.set(0, 0, localZOffset);
      layoutObj.add(zOffsetGroup);

      const totalBottomFlapsHeight = rootCol?.bottomFlaps ? rootCol.bottomFlaps.reduce((sum: number, flap: any) => sum + flap.d3Height, 0) : 0;
      const modelGroup = new THREE.Object3D();
      modelGroup.position.set(-rootCol.d3Width / 2, totalBottomFlapsHeight, 0);
      zOffsetGroup.add(modelGroup);

      const panelNodeMap = new Map<any, THREE.Object3D>();

      if (rootCol && rootCol.mainRow) {
        const g = new THREE.Object3D();
        g.position.set(rootCol.d3Width / 2, rootCol.mainRow.d3CenterY, 0);
        modelGroup.add(g);
        panelNodeMap.set(rootCol.mainRow, g);
        
        let currentParent = modelGroup;
        let posY = rootCol.mainRow.d3CenterY + rootCol.mainRow.d3Height / 2;
        rootCol.topFlaps?.forEach((flap: any) => {
           const hinge = new THREE.Object3D();
           hinge.position.set(0, posY, 0);
           hinge.rotation.x = (flap.foldAngle ?? 90) * Math.PI / 180;
           currentParent.add(hinge);
           const p = new THREE.Object3D();
           p.position.set(0, flap.d3Height / 2, 0);
           hinge.add(p);
           panelNodeMap.set(flap, p);
           currentParent = hinge;
           posY = flap.d3Height;
        });

        currentParent = modelGroup;
        posY = rootCol.mainRow.d3CenterY - rootCol.mainRow.d3Height / 2;
        rootCol.bottomFlaps?.forEach((flap: any) => {
           const hinge = new THREE.Object3D();
           hinge.position.set(0, posY, 0);
           hinge.rotation.x = -(flap.foldAngle ?? 90) * Math.PI / 180;
           currentParent.add(hinge);
           const p = new THREE.Object3D();
           p.position.set(0, -flap.d3Height / 2, 0);
           hinge.add(p);
           panelNodeMap.set(flap, p);
           currentParent = hinge;
           posY = -flap.d3Height;
        });
      }

      let leftParent = modelGroup;
      for (let i = rootIdx - 1; i >= 0; i--) {
        const col = d3Columns[i];
        const prevCol = d3Columns[i + 1];
        const hinge = new THREE.Object3D();
        hinge.position.set(i === rootIdx - 1 ? 0 : -prevCol.d3Width, 0, 0);
        hinge.rotation.y = (col.rightFoldAngle ?? col.foldAngle ?? 90) * Math.PI / 180;
        leftParent.add(hinge);
        const p = new THREE.Object3D();
        p.position.set(-col.d3Width / 2, col.mainRow.d3CenterY, 0);
        hinge.add(p);
        panelNodeMap.set(col.mainRow, p);
        leftParent = hinge;
      }

      let rightParent = modelGroup;
      for (let i = rootIdx + 1; i < d3Columns.length; i++) {
        const col = d3Columns[i];
        const prevCol = d3Columns[i - 1];
        const hinge = new THREE.Object3D();
        hinge.position.set(prevCol.d3Width, 0, 0);
        hinge.rotation.y = -(col.foldAngle ?? 90) * Math.PI / 180;
        rightParent.add(hinge);
        const p = new THREE.Object3D();
        p.position.set(col.d3Width / 2, col.mainRow.d3CenterY, 0);
        hinge.add(p);
        panelNodeMap.set(col.mainRow, p);
        rightParent = hinge;
      }

      layoutObj.updateMatrixWorld(true);

      subAreas.forEach((sa) => {
         const rawType = (sa.accentType as string) || (sa.isCutout ? 'cutout' : (sa.hasSill ? 'niche' : 'flat'));
         const resolvedType = (rawType === 'bench' ? 'shelf' : rawType) as 'flat' | 'niche' | 'shelf' | 'cutout';
         if (resolvedType === 'niche' || resolvedType === 'cutout') {
            let targetPanel: any = null;
            const saCenterX = sa.x + sa.width / 2;
            const saCenterY = sa.y + sa.height / 2;
            d3Columns.forEach((col) => {
               if (saCenterX >= col.startX && saCenterX <= col.endX) {
                  if (saCenterY >= col.mainRow.startY && saCenterY <= col.mainRow.startY + col.mainRow.height) {
                     targetPanel = col.mainRow;
                  } else if (saCenterY < col.mainRow.startY) {
                     col.bottomFlaps?.forEach((flap: any) => { if (saCenterY >= flap.startY && saCenterY <= flap.startY + flap.height) targetPanel = flap; });
                  } else {
                     col.topFlaps?.forEach((flap: any) => { if (saCenterY >= flap.startY && saCenterY <= flap.startY + flap.height) targetPanel = flap; });
                  }
               }
            });
            if (!targetPanel && rootCol) targetPanel = rootCol.mainRow;

            const panelNode = panelNodeMap.get(targetPanel);
            if (panelNode) {
               const borderThickness = sa.border?.enabled ? Math.min(sa.border.tileWidth, sa.border.tileHeight) : 0;
               const inset = resolvedType === 'cutout' ? -borderThickness : borderThickness;
               const activeX = sa.x + inset;
               const activeWidth = Math.max(0.01, sa.width - 2 * inset);
               const activeY = sa.y + inset;
               const activeHeight = Math.max(0.01, sa.height - 2 * inset);
               
               const toD3X_sa = (x: number) => ((x - targetPanel.startX) / targetPanel.width - 0.5) * targetPanel.d3Width;
               const toD3Y_sa = (y: number) => ((y - targetPanel.startY) / targetPanel.height - 0.5) * targetPanel.d3Height;
               const saLeft = toD3X_sa(activeX);
               const saRight = toD3X_sa(activeX + activeWidth);
               const saBottom = toD3Y_sa(activeY);
               const saTop = toD3Y_sa(activeY + activeHeight);
               
               const saLocalX = (saLeft + saRight) / 2;
               const saLocalY = (saBottom + saTop) / 2;
               const saD3Width = saRight - saLeft;
               const saD3Height = saTop - saBottom;

               const nicheNode = new THREE.Object3D();
               nicheNode.position.set(saLocalX, saLocalY, 0);
               panelNode.add(nicheNode);
               layoutObj.updateMatrixWorld(true);

               const worldPos = new THREE.Vector3();
               nicheNode.getWorldPosition(worldPos);
               const worldDir = new THREE.Vector3(0, 0, 1);
               worldDir.transformDirection(nicheNode.matrixWorld);
               
               let hitPlane = '';
               if (worldDir.z > 0.99) hitPlane = 'back';
               else if (worldDir.x > 0.99) hitPlane = 'left';
               else if (worldDir.x < -0.99) hitPlane = 'right';
               else if (worldDir.y > 0.99) hitPlane = 'floor';
               else if (worldDir.y < -0.99) hitPlane = 'ceiling';

               if (hitPlane) {
                  let hX = 0, hY = 0;
                  if (hitPlane === 'back') { hX = worldPos.x; hY = worldPos.y; }
                  else if (hitPlane === 'left') { hX = -worldPos.z; hY = worldPos.y; }
                  else if (hitPlane === 'right') { hX = worldPos.z; hY = worldPos.y; }
                  else if (hitPlane === 'floor') { hX = worldPos.x; hY = -worldPos.z; }
                  else if (hitPlane === 'ceiling') { hX = worldPos.x; hY = worldPos.z; }

                  holeConfigByPlane[hitPlane].push({
                     xLeft: hX - saD3Width / 2,
                     xRight: hX + saD3Width / 2,
                     yBottom: hY - saD3Height / 2,
                     yTop: hY + saD3Height / 2
                  });
               }
            }
         }
      });
    }
`;

code = code.replace(anchorRegex, anchorReplace);

// Remove the old else if block for niches
const nicheRegex = /\} else if \(\!isRecessed && attachedPlane === planeKey && subAreas && subAreas\.length > 0\) \{[\s\S]*?\} else if \(\!isRecessed && attachedPlane === planeKey && hasGhostBottomFlaps\) \{/g;
const nicheReplace = `} else {
        const nicheHoles = holeConfigByPlane[planeKey] || [];
        nicheHoles.forEach((hc) => {
          const hole = new THREE.Path();
          // Draw CLOCKWISE so Three.js triangulation recognizes it as a hole
          hole.moveTo(clampX(hc.xLeft), clampY(hc.yBottom));
          hole.lineTo(clampX(hc.xLeft), clampY(hc.yTop));
          hole.lineTo(clampX(hc.xRight), clampY(hc.yTop));
          hole.lineTo(clampX(hc.xRight), clampY(hc.yBottom));
          hole.closePath();
          shape.holes.push(hole);
        });
      }

      if (!isRecessed && attachedPlane === planeKey && hasGhostBottomFlaps) {`;

code = code.replace(nicheRegex, nicheReplace);

fs.writeFileSync(path, code);
