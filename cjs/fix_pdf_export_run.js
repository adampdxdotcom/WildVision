import fs from 'fs';
let code = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

const regex = /      let totalEstimatedCost = 0;\s*let hasPrices = false;\s*if \(purchasingSettings && Object\.keys\(purchasingSettings\)\.length > 0\) \{[\s\S]*?const isPaint = params\.colorPattern === 'paint'/;

const replacement = `      let totalEstimatedCost = 0;
      let hasPrices = false;
      
      const stats = computeComprehensiveStatistics({ ...params, reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts });

      if (purchasingSettings && Object.keys(purchasingSettings).length > 0) {
        hasPrices = true;
        const isImperial = unit === 'in';
        const conversionFactor = isImperial ? 144 : 929.0304;

        // Main Wall Area estimate
        if (!isBlankCanvasMode) {
          const settings = purchasingSettings['main'];
          if (settings) {
            const isMosaic = soldAsMosaic || false;
            const tW = tileWidth || 6;
            const tH = tileHeight || 6;
            const mW = mosaicWidth || 12;
            const mH = mosaicHeight || 12;
            const sheetSqIn = isMosaic ? (mW * mH) : (tW * tH);
            
            const totalRawTiles = stats.mainReport.totalTilesUsed || 0;
            const physicalAreaSqIn = totalRawTiles * sheetSqIn;
            const physicalAreaSqFt = physicalAreaSqIn / conversionFactor;
            const totalRequiredSqFt = physicalAreaSqFt * (1 + (overage / 100));

            if (settings.purchaseType === 'carton') {
              const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
              const pricePerSqFt = settings.pricePerSqFt || 0;
              const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
              totalEstimatedCost += cartonsNeeded * sqFtPerCarton * pricePerSqFt;
            } else if (settings.purchaseType === 'piece') {
              const pricePerSheet = settings.pricePerSheet || 0;
              const piecesNeeded = Math.ceil(totalRawTiles * (1 + (overage / 100)));
              totalEstimatedCost += piecesNeeded * pricePerSheet;
            } else {
              const pricePerSheet = settings.pricePerSheet || 0;
              const sheetAreaSqFt = sheetSqIn / conversionFactor;
              const sheetsNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
              totalEstimatedCost += sheetsNeeded * pricePerSheet;
            }
          }
        }

        // Sub-areas estimates
        subAreas.forEach((sa) => {
          const settings = purchasingSettings[sa.id];
          if (settings) {
            const isMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : (soldAsMosaic || false);
            const tW = sa.tileWidth || tileWidth || 6;
            const tH = sa.tileHeight || tileHeight || 6;
            const mW = sa.mosaicWidth || mosaicWidth || 12;
            const mH = sa.mosaicHeight || mosaicHeight || 12;
            const sheetSqIn = isMosaic ? (mW * mH) : (tW * tH);
            
            const totalRawTiles = stats.subAreaReports.find(r => r.subAreaId === sa.id)?.report.totalTilesUsed || 0;
            const physicalAreaSqIn = totalRawTiles * sheetSqIn;
            const physicalAreaSqFt = physicalAreaSqIn / conversionFactor;
            const totalRequiredSqFt = physicalAreaSqFt * (1 + (overage / 100));

            if (settings.purchaseType === 'carton') {
              const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
              const pricePerSqFt = settings.pricePerSqFt || 0;
              const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
              totalEstimatedCost += cartonsNeeded * sqFtPerCarton * pricePerSqFt;
            } else if (settings.purchaseType === 'piece') {
              const pricePerSheet = settings.pricePerSheet || 0;
              const piecesNeeded = Math.ceil(totalRawTiles * (1 + (overage / 100)));
              totalEstimatedCost += piecesNeeded * pricePerSheet;
            } else {
              const pricePerSheet = settings.pricePerSheet || 0;
              const sheetAreaSqFt = sheetSqIn / conversionFactor;
              const sheetsNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
              totalEstimatedCost += sheetsNeeded * pricePerSheet;
            }
          }
        });
      }

      const isPaint = params.colorPattern === 'paint'`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/utils/pdfExport.ts', code);
