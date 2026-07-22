const fs = require('fs');
const content = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

const match = content.match(/if \(params\.elevationMetadata\) \{[\s\S]*?(?=\}\s+const label3d)/);
if (!match) {
  console.log("Could not find block");
  process.exit(1);
}

const replacement = `if (params.elevationMetadata) {
            const { roomDimensions, subAreas, wallVertices } = useAppStore.getState();
            const activeWallW = params.elevationMetadata.wallWidth;
            const activeWallH = params.elevationMetadata.wallHeight;
            const scale = oRenderWidth / activeWallW; // PDF points per real-world inch
            
            pdf.setDrawColor(100, 100, 100);
            pdf.setLineWidth(0.5);
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            
            const formatFeet = (inches) => parseFloat((inches / 12).toFixed(1)) + "'";
            
            // TOP (Width)
            const topY = oYOffset - 18;
            pdf.line(oXOffset, topY, oXOffset + oRenderWidth, topY); // Main line
            pdf.line(oXOffset, oYOffset, oXOffset, topY - 2); // Left Witness
            pdf.line(oXOffset + oRenderWidth, oYOffset, oXOffset + oRenderWidth, topY - 2); // Right Witness
            pdf.text(formatFeet(activeWallW), oXOffset + (oRenderWidth / 2), topY - 4, { align: "center" });

            // LEFT (Height)
            const leftX = oXOffset - 22;
            pdf.line(leftX, oYOffset, leftX, oYOffset + oRenderHeight); // Main line
            pdf.line(oXOffset, oYOffset, leftX - 2, oYOffset); // Top Witness
            pdf.line(oXOffset, oYOffset + oRenderHeight, leftX - 2, oYOffset + oRenderHeight); // Bottom Witness
            pdf.text(formatFeet(activeWallH), leftX - 4, oYOffset + (oRenderHeight / 2), { align: "right", baseline: "middle" });
            
            let minX = 0, maxX = activeWallW, minY = 0, maxY = activeWallH;
            if (wallVertices && wallVertices.length > 0) {
              minX = Math.min(...wallVertices.map(v => v.x));
              maxX = Math.max(...wallVertices.map(v => v.x));
              minY = Math.min(...wallVertices.map(v => v.y));
              maxY = Math.max(...wallVertices.map(v => v.y));
            }
            const tileW = maxX - minX;
            const tileH = maxY - minY;
            const tilePdfLeft = oXOffset + (minX * scale);
            const tilePdfRight = oXOffset + (maxX * scale);
            const tilePdfBottom = (oYOffset + oRenderHeight) - (minY * scale);
            const tilePdfTop = (oYOffset + oRenderHeight) - (maxY * scale);
            
            pdf.setFontSize(8);
            pdf.setLineWidth(0.3);
            
            // BOTTOM
            const botY = tilePdfBottom + 8;
            pdf.line(tilePdfLeft, botY, tilePdfRight, botY);
            pdf.line(tilePdfLeft, tilePdfBottom, tilePdfLeft, botY + 2);
            pdf.line(tilePdfRight, tilePdfBottom, tilePdfRight, botY + 2);
            pdf.text(String(tileW) + '"', tilePdfLeft + (tilePdfRight - tilePdfLeft)/2, botY + 4, { align: "center", baseline: "top" });
            
            // RIGHT
            const rightX = tilePdfRight + 8;
            pdf.line(rightX, tilePdfTop, rightX, tilePdfBottom);
            pdf.line(tilePdfRight, tilePdfTop, rightX + 2, tilePdfTop);
            pdf.line(tilePdfRight, tilePdfBottom, rightX + 2, tilePdfBottom);
            pdf.text(String(tileH) + '"', rightX + 4, tilePdfTop + (tilePdfBottom - tilePdfTop)/2, { align: "left", baseline: "middle" });
            
            subAreas.forEach(sa => {
              const pdfX = oXOffset + (sa.x * scale);
              const pdfY = (oYOffset + oRenderHeight) - ((sa.y + sa.height) * scale);
              const pdfW = sa.width * scale;
              const pdfH = sa.height * scale;
              
              pdf.line(pdfX, pdfY - 4, pdfX + pdfW, pdfY - 4);
              pdf.text(String(sa.width) + '"', pdfX + (pdfW / 2), pdfY - 6, { align: "center" });
              
              pdf.line(pdfX + pdfW + 4, pdfY, pdfX + pdfW + 4, pdfY + pdfH);
              pdf.text(String(sa.height) + '"', pdfX + pdfW + 6, pdfY + (pdfH / 2), { align: "left", baseline: "middle" });
            });
          }`;

const newContent = content.substring(0, match.index) + replacement + content.substring(match.index + match[0].length);
fs.writeFileSync('src/utils/pdfExport.ts', newContent);
console.log("Done");
