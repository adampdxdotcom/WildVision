import fs from 'fs';
let code = fs.readFileSync('src/components/QuantitiesPanel.tsx', 'utf8');

const target = `    let recQty = 0;
    let qUnit = 'Tiles';

    if (set.purchaseType === 'sheet') {
      const recAreaSqIn = currArea * overageMult;
      recQty = sheetSqIn > 0 ? Math.ceil(recAreaSqIn / sheetSqIn) : 0;
      qUnit = 'Sheets';
    } else if (set.purchaseType === 'piece') {
      recQty = Math.ceil((report.totalTilesUsed || 0) * overageMult);
      qUnit = 'Pieces';
    } else {
      recQty = Math.ceil((report.totalTilesUsed || 0) * overageMult);
      qUnit = 'Pieces';
    }

    const isPaintPat = areaId === 'main' && useAppStore.getState().colorPattern === 'paint' && !!report.colorGroups;

    const totColorCost = isPaintPat && report.colorGroups
      ? report.colorGroups.reduce((sum, g) => {
          const groupAreaSqFt = g.netArea / 144;
          const groupAreaWithOverage = groupAreaSqFt * overageMult;
          if (set.purchaseType === 'carton') {
            const cartons = set.sqFtPerCarton ? Math.ceil(groupAreaWithOverage / Number(set.sqFtPerCarton)) : 0;
            return sum + (cartons * Number(set.sqFtPerCarton) * set.pricePerSqFt);
          } else if (set.purchaseType === 'piece') {
            const pieces = Math.ceil(g.count * overageMult);
            return sum + (pieces * set.pricePerSheet);
          } else {
            const sheets = sheetSqIn > 0 ? Math.ceil((g.netArea * overageMult) / sheetSqIn) : 0;
            return sum + (sheets * set.pricePerSheet);
          }
        }, 0)
      : 0;

    const normCost = set.purchaseType === 'carton'
      ? (set.sqFtPerCarton ? Math.ceil(((currArea / 144) * overageMult) / Number(set.sqFtPerCarton)) * Number(set.sqFtPerCarton) * set.pricePerSqFt : 0)
      : recQty * set.pricePerSheet;

    const fCost = isPaintPat ? totColorCost : normCost;

    let ordStr = '';
    if (isPaintPat) {
      ordStr = 'Multi-color Order';
    } else {
      if (set.purchaseType === 'carton') {
        const cartons = set.sqFtPerCarton ? Math.ceil(((currArea / 144) * overageMult) / Number(set.sqFtPerCarton)) : 0;
        ordStr = \`\${cartons} Cartons\`;
      } else {
        ordStr = \`\${recQty} \${qUnit}\`;
      }
    }`;

const replace = `    let recQty = 0;
    let qUnit = 'Tiles';

    // Step 2: Ensure "Recommended Sq Ft" strictly uses pieces required.
    // Calculate the physical area in sq inches based entirely on totalRawTiles (which reflects the toggle).
    const totalRawTiles = report.totalTilesUsed || 0;
    const physicalAreaSqIn = totalRawTiles * sheetSqIn; 
    const physicalAreaSqFt = physicalAreaSqIn / 144;
    
    // This overrides currArea for purchasing calculations!
    const effectiveAreaSqFt = physicalAreaSqFt;
    const effectiveAreaSqIn = physicalAreaSqIn;

    if (set.purchaseType === 'sheet') {
      const recAreaSqIn = effectiveAreaSqIn * overageMult;
      recQty = sheetSqIn > 0 ? Math.ceil(recAreaSqIn / sheetSqIn) : 0;
      qUnit = 'Sheets';
    } else {
      recQty = Math.ceil((report.totalTilesUsed || 0) * overageMult);
      qUnit = 'Pieces';
    }

    const isPaintPat = areaId === 'main' && useAppStore.getState().colorPattern === 'paint' && !!report.colorGroups;

    const totColorCost = isPaintPat && report.colorGroups
      ? report.colorGroups.reduce((sum, g) => {
          const groupRawTiles = g.count || 0;
          const groupPhysicalAreaSqIn = groupRawTiles * sheetSqIn;
          const groupEffectiveAreaSqFt = groupPhysicalAreaSqIn / 144;
          const groupAreaWithOverage = groupEffectiveAreaSqFt * overageMult;

          if (set.purchaseType === 'carton') {
            const cartons = set.sqFtPerCarton ? Math.ceil(groupAreaWithOverage / Number(set.sqFtPerCarton)) : 0;
            return sum + (cartons * Number(set.sqFtPerCarton) * set.pricePerSqFt);
          } else if (set.purchaseType === 'piece') {
            const pieces = Math.ceil(groupRawTiles * overageMult);
            return sum + (pieces * set.pricePerSheet);
          } else {
            const sheets = sheetSqIn > 0 ? Math.ceil((groupPhysicalAreaSqIn * overageMult) / sheetSqIn) : 0;
            return sum + (sheets * set.pricePerSheet);
          }
        }, 0)
      : 0;

    const normCost = set.purchaseType === 'carton'
      ? (set.sqFtPerCarton ? Math.ceil((effectiveAreaSqFt * overageMult) / Number(set.sqFtPerCarton)) * Number(set.sqFtPerCarton) * set.pricePerSqFt : 0)
      : recQty * set.pricePerSheet;

    const fCost = isPaintPat ? totColorCost : normCost;

    let ordStr = '';
    if (isPaintPat) {
      ordStr = 'Multi-color Order';
    } else {
      if (set.purchaseType === 'carton') {
        const cartons = set.sqFtPerCarton ? Math.ceil((effectiveAreaSqFt * overageMult) / Number(set.sqFtPerCarton)) : 0;
        ordStr = \`\${cartons} Cartons\`;
      } else {
        ordStr = \`\${recQty} \${qUnit}\`;
      }
    }`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/QuantitiesPanel.tsx', code);
