const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

// Replace pdfLayoutMode type
code = code.replace(
  "  pdfLayoutMode?: 'auto' | '1page' | '2page';",
  "  pdfLayoutMode?: 'auto' | '1page' | '2page' | '3page';"
);

// We need to inject the logic in runExport
const runExportTarget = `    const pdf = new jsPDF('p', 'mm', 'a4');

    let isTwoPage = false;
    if (pdfLayoutMode === '2page') {
      isTwoPage = true;
    } else if (pdfLayoutMode === 'auto') {
      isTwoPage = subAreas.length > 0 || (wallExtensions && wallExtensions.length > 0);
    }
    const totalPages = isTwoPage ? 2 : 1;

    // Draw page 1 header and footer
    drawPdfHeaderAndFooter(pdf, 1, projectName, displayWallWidth, displayWallHeight, unit, isTwoPage, totalPages);

    const maxDiagWidth = 180;
    const maxDiagHeight = isTwoPage ? 200 : 110;`;

const runExportReplacement = `    const pdfElevationUrl = useAppStore.getState().pdfElevationUrl;
    const pdf = new jsPDF('p', 'mm', 'a4');

    let isThreePage = false;
    let isTwoPage = false;

    if (pdfElevationUrl && (pdfLayoutMode === 'auto' || pdfLayoutMode === '3page')) {
      isThreePage = true;
    } else if (pdfLayoutMode === '2page') {
      isTwoPage = true;
    } else if (pdfLayoutMode === 'auto') {
      isTwoPage = subAreas.length > 0 || (wallExtensions && wallExtensions.length > 0);
    }
    
    const totalPages = isThreePage ? 3 : (isTwoPage ? 2 : 1);

    // Draw page 1 header and footer
    drawPdfHeaderAndFooter(pdf, 1, projectName, displayWallWidth, displayWallHeight, unit, isTwoPage || isThreePage, totalPages);

    const maxDiagWidth = 180;
    const maxDiagHeight = (isTwoPage || isThreePage) ? 200 : 110;`;

code = code.replace(runExportTarget, runExportReplacement);

const newPage2Target = `    if (isTwoPage) {
      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 2, projectName, displayWallWidth, displayWallHeight, unit, isTwoPage, totalPages);
    }`;

const newPage2Replacement = `    if (isThreePage) {
      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 2, projectName, displayWallWidth, displayWallHeight, unit, true, totalPages);
      
      try {
        if (pdfElevationUrl) {
          const orthoImg = await loadImage(pdfElevationUrl);
          const oAspect = orthoImg.width / orthoImg.height;
          let oRenderWidth = maxDiagWidth;
          let oRenderHeight = maxDiagWidth / oAspect;
          if (oRenderHeight > maxDiagHeight) {
            oRenderHeight = maxDiagHeight;
            oRenderWidth = maxDiagHeight * oAspect;
          }
          const oXOffset = 15 + (maxDiagWidth - oRenderWidth) / 2;
          const oYOffset = 38 + (maxDiagHeight - oRenderHeight) / 2;
          pdf.addImage(orthoImg, 'JPEG', oXOffset, oYOffset, oRenderWidth, oRenderHeight);
          
          const label3d = "3D Real Render Elevation View";
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(79, 70, 229); 
          const textW = pdf.getTextWidth(label3d);
          pdf.text(label3d, 15 + (maxDiagWidth - textW) / 2, oYOffset + oRenderHeight + 8);
        } else {
          throw new Error("No URL provided");
        }
      } catch (err) {
        console.error("Failed to load 3D elevation image:", err);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(12);
        pdf.setTextColor(100, 116, 139);
        const placeholder = "3D Elevation Image Unavailable";
        const w = pdf.getTextWidth(placeholder);
        pdf.text(placeholder, 15 + (maxDiagWidth - w)/2, 38 + maxDiagHeight/2);
      }

      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 3, projectName, displayWallWidth, displayWallHeight, unit, true, totalPages);
    } else if (isTwoPage) {
      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 2, projectName, displayWallWidth, displayWallHeight, unit, true, totalPages);
    }`;

code = code.replace(newPage2Target, newPage2Replacement);

const cardHeightTarget = `    const cardY = isTwoPage ? 38 : yOffset + renderHeight + 12;
    const cardWidth = 180;
    const cardHeight = isTwoPage 
      ? (activeShowPrices ? 110 : 237) 
      : (activeShowPrices ? 55 : Math.max(80, 280 - cardY - 5));

    drawSpecificationsCard(pdf, cardX, cardY, cardWidth, cardHeight, isTwoPage, displayWallWidth, displayWallHeight, subAreas, params);

    if (activeShowPrices) {
      const estCardX = 15;
      const estCardY = isTwoPage ? 158 : cardY + cardHeight + 6;
      const estCardWidth = 180;
      const estCardHeight = isTwoPage ? 117 : 280 - estCardY - 5;
      
      drawPricingCard(pdf, estCardX, estCardY, estCardWidth, estCardHeight, subAreas, params);
    }

    if (!isTwoPage) {`;

const cardHeightReplacement = `    const isMultiPage = isTwoPage || isThreePage;
    const cardY = isMultiPage ? 38 : yOffset + renderHeight + 12;
    const cardWidth = 180;
    const cardHeight = isMultiPage 
      ? (activeShowPrices ? 110 : 237) 
      : (activeShowPrices ? 55 : Math.max(80, 280 - cardY - 5));

    drawSpecificationsCard(pdf, cardX, cardY, cardWidth, cardHeight, isMultiPage, displayWallWidth, displayWallHeight, subAreas, params);

    if (activeShowPrices) {
      const estCardX = 15;
      const estCardY = isMultiPage ? 158 : cardY + cardHeight + 6;
      const estCardWidth = 180;
      const estCardHeight = isMultiPage ? 117 : 280 - estCardY - 5;
      
      drawPricingCard(pdf, estCardX, estCardY, estCardWidth, estCardHeight, subAreas, params);
    }

    if (!isMultiPage) {`;

code = code.replace(cardHeightTarget, cardHeightReplacement);

fs.writeFileSync('src/utils/pdfExport.ts', code);
