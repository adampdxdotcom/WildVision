import fs from 'fs';

const filePath = './src/utils/pdfExport.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Extract drawHeaderAndFooter
const headerFooterStart = `    const drawHeaderAndFooter = (pageIndex: number) => {`;
const headerFooterEnd = `    };\n\n    // Draw page 1 header and footer immediately`;

const headerFooterBody = content.substring(content.indexOf(headerFooterStart), content.indexOf(headerFooterEnd) + `    };\n`.length);

content = content.replace(headerFooterBody, `    const drawHeaderAndFooter = (pageIndex: number) => {
      drawPdfHeaderAndFooter({
        pdf,
        pageIndex,
        projectName,
        displayWallWidth,
        displayWallHeight,
        unit,
        isTwoPage,
        totalPages
      });
    };\n`);

// 2. Extract Specifications Card
const specStart = `    // --- Draw Elegant Specifications Card at the Bottom ---`;
const specEnd = `    // --- Draw Pricing and Overage Estimation Card ---`;
const specBody = content.substring(content.indexOf(specStart), content.indexOf(specEnd));

content = content.replace(specBody, `    // --- Draw Elegant Specifications Card at the Bottom ---
    drawSpecificationsCard({
      pdf, cardX, cardY, cardWidth, cardHeight, isTwoPage, showPricesOnPdf, displayWallWidth, displayWallHeight, unit, wallWidth, wallHeight, wallVertices, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallExtensions, isBlankCanvasMode, tileName, shape, tileWidth, tileHeight, pattern, printQuantities, subAreas, statsReport, groutWidth, mosaicWidth, mosaicHeight, soldAsMosaic, overage, hasNotes, notes
    });\n\n`);

// 3. Extract Pricing Card
const priceStart = `    // --- Draw Pricing and Overage Estimation Card ---`;
const priceEnd = `    if (!isTwoPage) {`;
const priceBody = content.substring(content.indexOf(priceStart), content.indexOf(priceEnd));

content = content.replace(priceBody, `    // --- Draw Pricing and Overage Estimation Card ---
    if (showPricesOnPdf) {
      drawPricingCard({
        pdf,
        cardY,
        cardHeight,
        isTwoPage,
        subAreas,
        statsReport,
        purchasingSettings,
        soldAsMosaic,
        overage,
        isBlankCanvasMode
      });
    }\n\n`);

// Add helper functions at the end
const helpers = `

// --- Extracted Helpers ---
function drawPdfHeaderAndFooter({
  pdf, pageIndex, projectName, displayWallWidth, displayWallHeight, unit, isTwoPage, totalPages
}: any) {
\${headerFooterBody.replace('    const drawHeaderAndFooter = (pageIndex: number) => {', '').replace('    };', '')}
}

function drawSpecificationsCard({
  pdf, cardX, cardY, cardWidth, cardHeight, isTwoPage, showPricesOnPdf, displayWallWidth, displayWallHeight, unit, wallWidth, wallHeight, wallVertices, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallExtensions, isBlankCanvasMode, tileName, shape, tileWidth, tileHeight, pattern, printQuantities, subAreas, statsReport, groutWidth, mosaicWidth, mosaicHeight, soldAsMosaic, overage, hasNotes, notes
}: any) {
\${specBody.replace('    // --- Draw Elegant Specifications Card at the Bottom ---', '')}
}

function drawPricingCard({
  pdf, cardY, cardHeight, isTwoPage, subAreas, statsReport, purchasingSettings, soldAsMosaic, overage, isBlankCanvasMode
}: any) {
\${priceBody.replace('    // --- Draw Pricing and Overage Estimation Card ---', '').replace(/    if \\(showPricesOnPdf\\) \\{\\n([\\s\\S]*)\\n    \\}/, '$1')}
}
`;

content += helpers;

fs.writeFileSync(filePath, content);
console.log('Refactor complete!');
