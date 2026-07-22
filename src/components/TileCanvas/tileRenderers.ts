import { pseudoRandom2D, getVariedColor } from '../../utils/geometry';
import { availableMaterialTextures } from '../../store/useAppStore';

function applyMaterialPattern(
  ctx: CanvasRenderingContext2D,
  materialImage: HTMLImageElement,
  viewportScale: number,
  tileWidthPx: number,
  tileHeightPx: number,
  physicalCenter: { x: number; y: number } | undefined,
  pCenter: { x: number; y: number }
) {
  let realWorldWidth = 24;
  if (materialImage.src) {
    const srcLower = materialImage.src.toLowerCase();
    const def = availableMaterialTextures.find(t => {
      if (t.url === materialImage.src) return true;
      const cleanSrc = materialImage.src.split('?')[0];
      const cleanUrl = t.url.split('?')[0];
      if (cleanSrc.endsWith(cleanUrl) || cleanUrl.endsWith(cleanSrc)) return true;
      if (srcLower.includes(t.id.toLowerCase())) return true;
      return false;
    });
    if (def && typeof def.realWorldWidth === 'number') {
      realWorldWidth = def.realWorldWidth;
    }
  }

  const imgW = materialImage.naturalWidth || materialImage.width || 256;
  const imgH = materialImage.naturalHeight || materialImage.height || 256;

  // 1. Retrieve calculated finalScale
  const baseScale = (realWorldWidth * viewportScale) / imgW;
  const scaleX = tileWidthPx / (imgW * baseScale);
  const scaleY = tileHeightPx / (imgH * baseScale);
  const finalScale = baseScale * Math.max(scaleX, scaleY, 1.0);

  // 2. Calculate the scaled image size
  const scaledImgW = imgW * finalScale;
  const scaledImgH = imgH * finalScale;

  // 3. Tile bounds and diagonal in pixels
  const tileW_px = tileWidthPx;
  const tileH_px = tileHeightPx;
  const tileDiag = Math.sqrt(tileW_px ** 2 + tileH_px ** 2);

  // 4. Generate stable coordinate-seeded random values
  const rxVal = physicalCenter ? physicalCenter.x : pCenter.x;
  const ryVal = physicalCenter ? physicalCenter.y : pCenter.y;
  const seedX = Math.round(rxVal * 1000);
  const seedY = Math.round(ryVal * 1000);
  const seededRandomVal = (x: number, y: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return val - Math.floor(val);
  };
  const randX = seededRandomVal(seedX, seedY);
  const randY = seededRandomVal(seedX + 57, seedY + 97);
  const randRot = seededRandomVal(seedX + 123, seedY + 456);

  let randomAngleDegrees = 0;
  let maxShiftX = 0;
  let maxShiftY = 0;

  if (scaledImgW > tileDiag && scaledImgH > tileDiag) {
    // Free Rotation Mode
    randomAngleDegrees = randRot * 360;
    maxShiftX = Math.max(0, (scaledImgW - tileDiag) / 2);
    maxShiftY = Math.max(0, (scaledImgH - tileDiag) / 2);
  } else {
    // Orthogonal Rotation Mode
    const step = Math.floor(randRot * 4); // 0, 1, 2, 3
    randomAngleDegrees = step * 90; // 0, 90, 180, 270
    if (randomAngleDegrees === 90 || randomAngleDegrees === 270) {
      maxShiftX = Math.max(0, (scaledImgW - tileH_px) / 2);
      maxShiftY = Math.max(0, (scaledImgH - tileW_px) / 2);
    } else {
      maxShiftX = Math.max(0, (scaledImgW - tileW_px) / 2);
      maxShiftY = Math.max(0, (scaledImgH - tileH_px) / 2);
    }
  }

  // 5. Multiply deterministic random factors (-1.0 to 1.0) by safe limits
  const factorX = randX * 2 - 1;
  const factorY = randY * 2 - 1;

  const randomOffsetX = factorX * maxShiftX;
  const randomOffsetY = factorY * maxShiftY;

  const pattern = ctx.createPattern(materialImage, 'repeat');
  if (pattern) {
    try {
      if (typeof DOMMatrix !== 'undefined') {
        const matrix = new DOMMatrix();
        matrix.translateSelf(pCenter.x, pCenter.y);
        matrix.rotateSelf(randomAngleDegrees);
        matrix.translateSelf(randomOffsetX, randomOffsetY);
        matrix.scaleSelf(finalScale, finalScale);
        matrix.translateSelf(-imgW / 2, -imgH / 2);
        pattern.setTransform(matrix);
      } else {
        const tx = pCenter.x + randomOffsetX - (finalScale * imgW) / 2;
        const ty = pCenter.y + randomOffsetY - (finalScale * imgH) / 2;
        pattern.setTransform({ a: finalScale, b: 0, c: 0, d: finalScale, e: tx, f: ty });
      }
    } catch (err) {
      try {
        const tx = pCenter.x + randomOffsetX - (finalScale * imgW) / 2;
        const ty = pCenter.y + randomOffsetY - (finalScale * imgH) / 2;
        pattern.setTransform({ a: finalScale, b: 0, c: 0, d: finalScale, e: tx, f: ty } as any);
      } catch (_) {}
    }
    ctx.fillStyle = pattern;
    ctx.fill();
  }
}

export function drawRoundTile(
  ctx: CanvasRenderingContext2D,
  pCenter: { x: number; y: number },
  radius: number,
  tileColor: string,
  tileSpecular: boolean,
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null,
  physicalCenter?: { x: number; y: number },
  patternImg?: HTMLImageElement | null,
  patternAngleRad: number = 0,
  viewportScale: number = 1.0
) {
  ctx.beginPath();
  ctx.arc(pCenter.x, pCenter.y, radius, 0, Math.PI * 2);
  ctx.closePath();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = isBumpMapMode ? '#ffffff' : tileColor;
  ctx.fill();

  if (patternImg && patternImg.complete && patternImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(pCenter.x, pCenter.y);
    ctx.rotate(patternAngleRad);
    const size = radius * 2;
    ctx.drawImage(patternImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  if (isBumpMapMode) {
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = Math.max(2.0, Math.min(5.0, radius * 0.03));
    ctx.stroke();
    ctx.restore();
  }

  if (materialImage) {
    ctx.globalCompositeOperation = 'multiply';
    applyMaterialPattern(ctx, materialImage, viewportScale, radius * 2, radius * 2, physicalCenter, pCenter);
  }
  ctx.restore();

  if (!isBumpMapMode) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (tileSpecular) {
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.ellipse(
        pCenter.x - radius * 0.25,
        pCenter.y - radius * 0.25,
        radius * 0.25,
        radius * 0.15,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawScallopTile(
  ctx: CanvasRenderingContext2D,
  pCenter: { x: number; y: number },
  radius: number,
  tileColor: string,
  tileSpecular: boolean,
  angleRad: number = 0,
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null,
  physicalCenter?: { x: number; y: number },
  patternImg?: HTMLImageElement | null,
  patternAngleRad: number = 0,
  viewportScale: number = 1.0
) {
  ctx.save();
  ctx.translate(pCenter.x, pCenter.y);
  if (angleRad !== 0) {
    ctx.rotate(angleRad);
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, 0);
  ctx.arc(radius, radius, radius, Math.PI * 1.5, Math.PI, true);
  ctx.arc(-radius, radius, radius, 0, Math.PI * 1.5, true);
  ctx.closePath();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = isBumpMapMode ? '#ffffff' : tileColor;
  ctx.fill();

  if (patternImg && patternImg.complete && patternImg.naturalWidth > 0) {
    ctx.save();
    if (patternAngleRad !== angleRad) {
      ctx.rotate(patternAngleRad - angleRad);
    }
    const size = radius * 2;
    ctx.drawImage(patternImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  if (isBumpMapMode) {
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = Math.max(2.0, Math.min(5.0, radius * 0.03));
    ctx.stroke();
    ctx.restore();
  }

  if (materialImage) {
    ctx.globalCompositeOperation = 'multiply';
    applyMaterialPattern(ctx, materialImage, viewportScale, radius * 2, radius * 2, physicalCenter, pCenter);
  }
  ctx.restore();

  if (!isBumpMapMode) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (tileSpecular) {
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.ellipse(
        -radius * 0.25,
        -radius * 0.25,
        radius * 0.25,
        radius * 0.15,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

export function drawHexagonTileDirect(
  ctx: CanvasRenderingContext2D,
  pCenter: { x: number; y: number },
  drawRadius: number,
  tileColor: string,
  tileSpecular: boolean,
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null,
  physicalCenter?: { x: number; y: number },
  patternImg?: HTMLImageElement | null,
  patternAngleRad: number = 0,
  viewportScale: number = 1.0
) {
  const hVertices = [];
  for (let i = 0; i < 6; i++) {
    const hAngle = (i * Math.PI) / 3 + Math.PI / 6;
    const hx = pCenter.x + drawRadius * Math.cos(hAngle);
    const hy = pCenter.y + drawRadius * Math.sin(hAngle);
    hVertices.push({ x: hx, y: hy });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(hVertices[0].x, hVertices[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(hVertices[i].x, hVertices[i].y);
  }
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = isBumpMapMode ? '#ffffff' : tileColor;
  ctx.fill();

  if (patternImg && patternImg.complete && patternImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(pCenter.x, pCenter.y);
    ctx.rotate(patternAngleRad);
    const size = drawRadius * 2;
    ctx.drawImage(patternImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  if (isBumpMapMode) {
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = Math.max(2.0, Math.min(5.0, drawRadius * 0.03));
    ctx.stroke();
    ctx.restore();
  }

  if (materialImage) {
    ctx.globalCompositeOperation = 'multiply';
    const xs = hVertices.map(v => v.x);
    const ys = hVertices.map(v => v.y);
    const tileWidthPx = Math.max(...xs) - Math.min(...xs);
    const tileHeightPx = Math.max(...ys) - Math.min(...ys);
    applyMaterialPattern(ctx, materialImage, viewportScale, tileWidthPx, tileHeightPx, physicalCenter, pCenter);
  }
  ctx.restore();

  if (!isBumpMapMode) {
    // Modern 3D bevel borders for Hexagons
    // Highlight (light) border: index 2 -> 3 -> 4 -> 5
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(hVertices[2].x, hVertices[2].y);
    ctx.lineTo(hVertices[3].x, hVertices[3].y);
    ctx.lineTo(hVertices[4].x, hVertices[4].y);
    ctx.lineTo(hVertices[5].x, hVertices[5].y);
    ctx.stroke();

    // Shadow (dark) border: index 5 -> 0 -> 1 -> 2
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hVertices[5].x, hVertices[5].y);
    ctx.lineTo(hVertices[0].x, hVertices[0].y);
    ctx.lineTo(hVertices[1].x, hVertices[1].y);
    ctx.lineTo(hVertices[2].x, hVertices[2].y);
    ctx.stroke();

    if (tileSpecular) {
      // 3D specular corner shine (top-left surrounding vertex 3)
      const v3 = hVertices[3];
      const v2 = hVertices[2];
      const v4 = hVertices[4];
      
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.beginPath();
      ctx.moveTo(v3.x, v3.y);
      
      const m34_x = (v3.x + v4.x) / 2;
      const m34_y = (v3.y + v4.y) / 2;
      const shift34_x = m34_x + (pCenter.x - m34_x) * 0.15;
      const shift34_y = m34_y + (pCenter.y - m34_y) * 0.15;
      
      const m32_x = (v3.x + v2.x) / 2;
      const m32_y = (v3.y + v2.y) / 2;
      const shift32_x = m32_x + (pCenter.x - m32_x) * 0.15;
      const shift32_y = m32_y + (pCenter.y - m32_y) * 0.15;
      
      ctx.lineTo(shift34_x, shift34_y);
      ctx.lineTo(shift32_x, shift32_y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawPolygonTile(
  ctx: CanvasRenderingContext2D,
  canvasVertices: { x: number; y: number }[],
  pCenter: { x: number; y: number },
  tileColor: string,
  tileSpecular: boolean,
  shape?: string,
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null,
  physicalCenter?: { x: number; y: number },
  patternImg?: HTMLImageElement | null,
  patternAngleRad: number = 0,
  viewportScale: number = 1.0
) {
  if (canvasVertices.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.closePath();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = isBumpMapMode ? '#ffffff' : tileColor;
  ctx.fill();

  if (patternImg && patternImg.complete && patternImg.naturalWidth > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const v of canvasVertices) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const size = Math.max(w, h);

    ctx.save();
    ctx.translate(pCenter.x, pCenter.y);
    ctx.rotate(patternAngleRad);
    ctx.drawImage(patternImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  if (isBumpMapMode) {
    let avgDist = 15;
    if (canvasVertices.length > 0) {
      let sum = 0;
      for (const v of canvasVertices) {
        sum += Math.sqrt((v.x - pCenter.x) ** 2 + (v.y - pCenter.y) ** 2);
      }
      avgDist = sum / canvasVertices.length;
    }
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = Math.max(2.0, Math.min(5.0, avgDist * 0.03));
    ctx.stroke();
    ctx.restore();
  }

  if (materialImage) {
    ctx.globalCompositeOperation = 'multiply';
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const v of canvasVertices) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const tileWidthPx = maxX - minX;
    const tileHeightPx = maxY - minY;
    applyMaterialPattern(ctx, materialImage, viewportScale, tileWidthPx, tileHeightPx, physicalCenter, pCenter);
  }
  ctx.restore();

  if (!isBumpMapMode) {
    if (canvasVertices.length === 6) {
      // Modern 3D bevel borders for Hexagons and Pickets
      // Highlight (light) border: index 2 -> 3 -> 4 -> 5
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[2].x, canvasVertices[2].y);
      ctx.lineTo(canvasVertices[3].x, canvasVertices[3].y);
      ctx.lineTo(canvasVertices[4].x, canvasVertices[4].y);
      ctx.lineTo(canvasVertices[5].x, canvasVertices[5].y);
      ctx.stroke();

      // Shadow (dark) border: index 5 -> 0 -> 1 -> 2
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[5].x, canvasVertices[5].y);
      ctx.lineTo(canvasVertices[0].x, canvasVertices[0].y);
      ctx.lineTo(canvasVertices[1].x, canvasVertices[1].y);
      ctx.lineTo(canvasVertices[2].x, canvasVertices[2].y);
      ctx.stroke();
    } else if (canvasVertices.length === 8) {
      // Modern 3D bevel borders for Octagons
      // Highlight (light) border: index 6 -> 7 -> 0 -> 1 -> 2
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[6].x, canvasVertices[6].y);
      ctx.lineTo(canvasVertices[7].x, canvasVertices[7].y);
      ctx.lineTo(canvasVertices[0].x, canvasVertices[0].y);
      ctx.lineTo(canvasVertices[1].x, canvasVertices[1].y);
      ctx.lineTo(canvasVertices[2].x, canvasVertices[2].y);
      ctx.stroke();

      // Shadow (dark) border: index 2 -> 3 -> 4 -> 5 -> 6
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[2].x, canvasVertices[2].y);
      ctx.lineTo(canvasVertices[3].x, canvasVertices[3].y);
      ctx.lineTo(canvasVertices[4].x, canvasVertices[4].y);
      ctx.lineTo(canvasVertices[5].x, canvasVertices[5].y);
      ctx.lineTo(canvasVertices[6].x, canvasVertices[6].y);
      ctx.stroke();
    } else if (canvasVertices.length === 3) {
      // Modern 3D bevel borders for Triangles
      const isDown = canvasVertices[0].y > (canvasVertices[1].y + canvasVertices[2].y) / 2;
      if (!isDown) {
        // Highlight: left side (from bottom-left 2 to top apex 0)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(canvasVertices[2].x, canvasVertices[2].y);
        ctx.lineTo(canvasVertices[0].x, canvasVertices[0].y);
        ctx.stroke();

        // Shadow: right side and bottom (from top apex 0 to bottom-right 1 to bottom-left 2)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
        ctx.lineTo(canvasVertices[1].x, canvasVertices[1].y);
        ctx.lineTo(canvasVertices[2].x, canvasVertices[2].y);
        ctx.stroke();
      } else {
        // Highlight: top/left edges. Path: 0 (bottom apex) -> 2 (top-left) -> 1 (top-right)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
        ctx.lineTo(canvasVertices[2].x, canvasVertices[2].y);
        ctx.lineTo(canvasVertices[1].x, canvasVertices[1].y);
        ctx.stroke();

        // Shadow: right edge. Path: 1 (top-right) -> 0 (bottom apex)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvasVertices[1].x, canvasVertices[1].y);
        ctx.lineTo(canvasVertices[0].x, canvasVertices[0].y);
        ctx.stroke();
      }
    } else if (shape === 'octagon' || shape === 'triangle' || (canvasVertices.length !== 3 && canvasVertices.length !== 4 && canvasVertices.length !== 6 && canvasVertices.length !== 8)) {
      // Elegant clean outline stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
      for (let i = 1; i < canvasVertices.length; i++) {
        ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      // Modern bevel/3D border frames for rectangles, diamonds, chevrons
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[3].x, canvasVertices[3].y);
      ctx.lineTo(canvasVertices[0].x, canvasVertices[0].y);
      ctx.lineTo(canvasVertices[1].x, canvasVertices[1].y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvasVertices[1].x, canvasVertices[1].y);
      ctx.lineTo(canvasVertices[2].x, canvasVertices[2].y);
      ctx.lineTo(canvasVertices[3].x, canvasVertices[3].y);
      ctx.stroke();
    }

    if (tileSpecular) {
      ctx.save();
      ctx.filter = 'blur(3px)';
      if (canvasVertices.length === 4) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
        ctx.beginPath();
        ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
        ctx.lineTo((canvasVertices[0].x + canvasVertices[1].x) / 2 + (canvasVertices[3].x - canvasVertices[0].x) * 0.1, (canvasVertices[0].y + canvasVertices[1].y) / 2 + (canvasVertices[3].y - canvasVertices[0].y) * 0.1);
        ctx.lineTo((canvasVertices[0].x + canvasVertices[3].x) / 2 + (canvasVertices[1].x - canvasVertices[0].x) * 0.1, (canvasVertices[0].y + canvasVertices[3].y) / 2 + (canvasVertices[1].y - canvasVertices[0].y) * 0.1);
        ctx.closePath();
        ctx.fill();
      } else if (canvasVertices.length === 6) {
        // 3D specular corner shine for Hexagon / Picket (top-left surrounding vertex 3)
        const v3 = canvasVertices[3];
        const v2 = canvasVertices[2];
        const v4 = canvasVertices[4];
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
        ctx.beginPath();
        ctx.moveTo(v3.x, v3.y);
        
        const m34_x = (v3.x + v4.x) / 2;
        const m34_y = (v3.y + v4.y) / 2;
        const shift34_x = m34_x + (pCenter.x - m34_x) * 0.15;
        const shift34_y = m34_y + (pCenter.y - m34_y) * 0.15;
        
        const m32_x = (v3.x + v2.x) / 2;
        const m32_y = (v3.y + v2.y) / 2;
        const shift32_x = m32_x + (pCenter.x - m32_x) * 0.15;
        const shift32_y = m32_y + (pCenter.y - m32_y) * 0.15;
        
        ctx.lineTo(shift34_x, shift34_y);
        ctx.lineTo(shift32_x, shift32_y);
        ctx.closePath();
        ctx.fill();
      } else if (canvasVertices.length === 8) {
        // 3D specular corner shine for Octagon (centered around vertex 7, which is top-left)
        const v7 = canvasVertices[7];
        const v6 = canvasVertices[6];
        const v0 = canvasVertices[0];
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
        ctx.beginPath();
        ctx.moveTo(v7.x, v7.y);
        
        const m70_x = (v7.x + v0.x) / 2;
        const m70_y = (v7.y + v0.y) / 2;
        const shift70_x = m70_x + (pCenter.x - m70_x) * 0.15;
        const shift70_y = m70_y + (pCenter.y - m70_y) * 0.15;
        
        const m76_x = (v7.x + v6.x) / 2;
        const m76_y = (v7.y + v6.y) / 2;
        const shift76_x = m76_x + (pCenter.x - m76_x) * 0.15;
        const shift76_y = m76_y + (pCenter.y - m76_y) * 0.15;
        
        ctx.lineTo(shift70_x, shift70_y);
        ctx.lineTo(shift76_x, shift76_y);
        ctx.closePath();
        ctx.fill();
      } else if (canvasVertices.length === 3) {
        const isDown = canvasVertices[0].y > (canvasVertices[1].y + canvasVertices[2].y) / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
        ctx.beginPath();
        if (!isDown) {
          // Specular near top apex (v0)
          const v0 = canvasVertices[0];
          const v2 = canvasVertices[2];
          ctx.moveTo(v0.x, v0.y);

          const m02_x = (v0.x + v2.x) / 2;
          const m02_y = (v0.y + v2.y) / 2;
          const shift02_x = m02_x + (pCenter.x - m02_x) * 0.15;
          const shift02_y = m02_y + (pCenter.y - m02_y) * 0.15;

          const shift0_x = v0.x + (pCenter.x - v0.x) * 0.15;
          const shift0_y = v0.y + (pCenter.y - v0.y) * 0.15;

          ctx.lineTo(shift02_x, shift02_y);
          ctx.lineTo(shift0_x, shift0_y);
        } else {
          // Specular near top-left vertex (v2)
          const v2 = canvasVertices[2];
          const v1 = canvasVertices[1];
          const v0 = canvasVertices[0];
          ctx.moveTo(v2.x, v2.y);

          const m21_x = (v2.x + v1.x) / 2;
          const m21_y = (v2.y + v1.y) / 2;
          const shift21_x = m21_x + (pCenter.x - m21_x) * 0.15;
          const shift21_y = m21_y + (pCenter.y - m21_y) * 0.15;

          const m20_x = (v2.x + v0.x) / 2;
          const m20_y = (v2.y + v0.y) / 2;
          const shift20_x = m20_x + (pCenter.x - m20_x) * 0.15;
          const shift20_y = m20_y + (pCenter.y - m20_y) * 0.15;

          ctx.lineTo(shift21_x, shift21_y);
          ctx.lineTo(shift20_x, shift20_y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export function drawPebbleTile(
  ctx: CanvasRenderingContext2D,
  canvasVertices: { x: number; y: number }[],
  pCenter: { x: number; y: number },
  tileColor: string,
  tileSpecular: boolean = false,
  tileColors?: string[],
  colorPattern?: string,
  colorVariation?: 'V1' | 'V2' | 'V3' | 'V4',
  physicalCenter?: { x: number; y: number },
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null,
  patternImg?: HTMLImageElement | null,
  patternAngleRad: number = 0,
  viewportScale: number = 1.0
) {
  const xs = canvasVertices.map((v) => v.x);
  const ys = canvasVertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  // 1. Base grid unit (The Versailles matrix is based on a 6x6 grid)
  const cols = 6;
  const rows = 6;
  const uW = width / cols;
  const uH = height / rows;

  // 2. The authentic interlocking Versailles Block
  const versaillesBlock = [
      { dx: 0, dy: 0, w: 2, h: 2 },
      { dx: 5, dy: 0, w: 1, h: 1 },
      { dx: 0, dy: 2, w: 1, h: 2 },
      { dx: 1, dy: 2, w: 1, h: 1 },
      { dx: 2, dy: 1, w: 2, h: 2 },
      { dx: 4, dy: 1, w: 2, h: 3 },
      { dx: 1, dy: 3, w: 2, h: 2 },
      { dx: 3, dy: 3, w: 1, h: 1 },
      { dx: 3, dy: 4, w: 2, h: 1 },
      { dx: 5, dy: 4, w: 2, h: 2 }, // Overhangs right
      { dx: 1, dy: 5, w: 1, h: 1 },
      { dx: 2, dy: 5, w: 3, h: 2 }  // Overhangs bottom
  ];

  const groutGap = Math.min(uW, uH) * 0.15; // Tight, realistic grout line

  const seededRandom = (s: number) => {
    const val = Math.sin(s * 12.9898) * 43758.5453123;
    return val - Math.floor(val);
  };

  // 3. Render the pebbles based on the matrix
  for (const shape of versaillesBlock) {
    const { dx, dy, w, h } = shape;
    
    // Seed based on physical position if available, otherwise absolute position
    const physX = physicalCenter ? Math.round(physicalCenter.x * 100) : Math.round(pCenter.x);
    const physY = physicalCenter ? Math.round(physicalCenter.y * 100) : Math.round(pCenter.y);
    const seed = physX * 100 + physY + dx * 10 + dy;
    
    // Calculate center of the pebble
    const cx = minX + (dx + w / 2) * uW;
    const cy = minY + (dy + h / 2) * uH;

    // Calculate radii (leaving room for grout)
    let rx = (w * uW) / 2 - groutGap;
    let ry = (h * uH) / 2 - groutGap;

    // Organic Jitter (max 10% shift)
    const jX = (seededRandom(seed) - 0.5) * groutGap;
    const jY = (seededRandom(seed + 1) - 0.5) * groutGap;

    ctx.beginPath();
    ctx.ellipse(cx + jX, cy + jY, rx, ry, 0, 0, Math.PI * 2);
    ctx.closePath();
    
    ctx.save();
    ctx.clip();
    ctx.fillStyle = isBumpMapMode ? '#ffffff' : tileColor;
    if (!isBumpMapMode) {
      // Determine color variation per pebble inside the sheet
      let finalColor = tileColor;
      if (colorPattern === 'random_pieces' && tileColors && tileColors.length > 0) {
        const px = physicalCenter ? physicalCenter.x + dx : cx;
        const py = physicalCenter ? physicalCenter.y + dy : cy;
        const randValue = pseudoRandom2D(px, py);
        const colorIndex = Math.floor(randValue * tileColors.length);
        finalColor = tileColors[colorIndex] || finalColor;
      }
      if (colorVariation && colorVariation !== 'V1') {
        const px = physicalCenter ? physicalCenter.x + dx : cx;
        const py = physicalCenter ? physicalCenter.y + dy : cy;
        finalColor = getVariedColor(finalColor, px, py, colorVariation);
      }
      ctx.fillStyle = finalColor;
    }
    ctx.fill();

    if (patternImg && patternImg.complete && patternImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(patternAngleRad);
      const size = Math.max(rx, ry) * 2;
      ctx.drawImage(patternImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    if (isBumpMapMode) {
      const avgR = (rx + ry) / 2;
      ctx.save();
      ctx.filter = 'blur(2px)';
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = Math.max(2.0, Math.min(5.0, avgR * 0.03));
      ctx.stroke();
      ctx.restore();
    }

    if (materialImage) {
      ctx.globalCompositeOperation = 'multiply';
      const pebbleWidthPx = rx * 2;
      const pebbleHeightPx = ry * 2;
      const pebbleCenter = { x: cx + jX, y: cy + jY };
      const physCenter = physicalCenter ? { x: physicalCenter.x + dx, y: physicalCenter.y + dy } : undefined;
      applyMaterialPattern(ctx, materialImage, viewportScale, pebbleWidthPx, pebbleHeightPx, physCenter, pebbleCenter);
    }
    ctx.restore();
    
    if (!isBumpMapMode) {
      // Anti-aliasing fix (Crisp edges)
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Soft elegant bevel stroke lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      if (tileSpecular) {
        ctx.save();
        ctx.filter = 'blur(2px)';
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.ellipse(
          cx + jX - rx * 0.25,
          cy + jY - ry * 0.25,
          rx * 0.25,
          ry * 0.15,
          -Math.PI / 4,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

