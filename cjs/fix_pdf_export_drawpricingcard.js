import fs from 'fs';
let code = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

const regexPricingCard = /    if \(areaId === 'main'\) \{[\s\S]*?rawArea = getTrueArea\(sa\);\s*totalRawTiles = stats\.subAreaReports\.find\(r => r\.subAreaId === areaId\)\?\.report\.totalTilesUsed \|\| 0;\s*\}/g;

const replacementPricingCard = `    if (areaId === 'main') {
      if (isBlankCanvasMode) return null;
      areaName = 'Main Wall Area';
      materialType = tileName || 'Main Wall Tile';
      isMosaic = soldAsMosaic || false;
      totalRawTiles = stats.mainReport.totalTilesUsed;
    } else {
      sa = subAreas.find(s => s.id === areaId);
      if (!sa) return null;
      areaName = sa.name || 'Sub-Area';
      materialType = sa.tileName || 'Accent Tile';
      isMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : (soldAsMosaic || false);
      totalRawTiles = stats.subAreaReports.find(r => r.subAreaId === areaId)?.report.totalTilesUsed || 0;
    }`;

code = code.replace(regexPricingCard, replacementPricingCard);

const regexPricingMath = /    const isImperial = unit === 'in';\s*const baseSqFt = isImperial \? \(rawArea \/ 144\) : \(rawArea \/ 929\.0304\);\s*const totalRequiredSqFt = baseSqFt \* \(1 \+ \(overage \/ 100\)\);[\s\S]*?unitCostText = \`\$\{Number\(pricePerSheet \|\| 0\)\.toFixed\(2\)\} \/ sheet\`;\s*\}/g;

const replacementPricingMath = `    const isImperial = unit === 'in';
    const conversionFactor = isImperial ? 144 : 929.0304;

    const tW = areaId === 'main' ? (tileWidth || 6) : (sa?.tileWidth || tileWidth || 6);
    const tH = areaId === 'main' ? (tileHeight || 6) : (sa?.tileHeight || tileHeight || 6);
    const mW = areaId === 'main' ? (mosaicWidth || 12) : (sa?.mosaicWidth || mosaicWidth || 12);
    const mH = areaId === 'main' ? (mosaicHeight || 12) : (sa?.mosaicHeight || mosaicHeight || 12);

    const sheetSqIn = isMosaic ? (mW * mH) : (tW * tH);
    const physicalAreaSqIn = totalRawTiles * sheetSqIn;
    const physicalAreaSqFt = physicalAreaSqIn / conversionFactor;
    const totalRequiredSqFt = physicalAreaSqFt * (1 + (overage / 100));

    let suggestedOrderText = '';
    let unitCostText = '';
    let totalCost = 0;

    if (settings.purchaseType === 'carton') {
      const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
      const pricePerSqFt = settings.pricePerSqFt || 0;
      
      const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
      const purchasedSqFt = cartonsNeeded * sqFtPerCarton;
      totalCost = purchasedSqFt * pricePerSqFt;
      
      suggestedOrderText = \`\${cartonsNeeded} Cartons\`;
      unitCostText = \`\${Number(pricePerSqFt || 0).toFixed(2)} / sq.ft\`;
    } else if (settings.purchaseType === 'piece') {
      const pricePerSheet = settings.pricePerSheet || 0;
      const piecesNeeded = Math.ceil(totalRawTiles * (1 + (overage / 100)));
      totalCost = piecesNeeded * pricePerSheet;
      
      suggestedOrderText = \`\${piecesNeeded} Pieces\`;
      unitCostText = \`\${Number(pricePerSheet || 0).toFixed(2)} / piece\`;
    } else {
      const pricePerSheet = settings.pricePerSheet || 0;
      const sheetAreaSqFt = sheetSqIn / conversionFactor;
      
      const sheetsNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
      totalCost = sheetsNeeded * pricePerSheet;
      
      suggestedOrderText = \`\${sheetsNeeded} Sheets\`;
      unitCostText = \`\${Number(pricePerSheet || 0).toFixed(2)} / sheet\`;
    }`;

code = code.replace(regexPricingMath, replacementPricingMath);

fs.writeFileSync('src/utils/pdfExport.ts', code);
