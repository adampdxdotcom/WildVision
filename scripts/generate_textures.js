import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = crc32(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc, 0);
    return Buffer.concat([len, crcBuf, crcOut]);
  }

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }
  
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type (0: grayscale)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const scanlineSize = width + 1;
  const rawData = Buffer.alloc(scanlineSize * height);
  for (let y = 0; y < height; y++) {
    rawData[y * scanlineSize] = 0; // No filter
    for (let x = 0; x < width; x++) {
      rawData[y * scanlineSize + 1 + x] = getPixel(x, y);
    }
  }
  const idat = zlib.deflateSync(rawData);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const dir = path.join(process.cwd(), 'src', 'assets', 'textures');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Orange Skin
fs.writeFileSync(
  path.join(dir, 'orange_skin.png'),
  createPng(256, 256, (x, y) => {
    let val = 0.5;
    val += Math.sin(x * 2 * Math.PI / 16) * Math.cos(y * 2 * Math.PI / 16) * 0.15;
    val += Math.sin(x * 2 * Math.PI / 8 + 0.5) * Math.sin(y * 2 * Math.PI / 8 + 1.1) * 0.1;
    val += Math.cos(x * 2 * Math.PI / 4 + 1.5) * Math.cos(y * 2 * Math.PI / 4 + 0.2) * 0.05;
    val += Math.sin(x * 2 * Math.PI / 2 + 0.1) * Math.sin(y * 2 * Math.PI / 2 + 2.3) * 0.03;
    return Math.max(0, Math.min(255, Math.floor(val * 255)));
  })
);

// 2. Natural Stone
fs.writeFileSync(
  path.join(dir, 'natural_stone.png'),
  createPng(256, 256, (x, y) => {
    let val = 0.5;
    val += Math.sin(x * 2 * Math.PI / 128) * Math.cos(y * 2 * Math.PI / 128) * 0.2;
    val += Math.sin(x * 2 * Math.PI / 64 + 0.8) * Math.sin(y * 2 * Math.PI / 64 + 2.1) * 0.12;
    const veinInput = Math.sin(x * 2 * Math.PI / 64 + y * 2 * Math.PI / 64 + 1.3) * 0.5 + 0.5;
    const vein = Math.pow(veinInput, 6) * 0.25;
    val -= vein;
    val += Math.sin(x * 2 * Math.PI / 8) * Math.sin(y * 2 * Math.PI / 8) * 0.03;
    return Math.max(0, Math.min(255, Math.floor(val * 255)));
  })
);

// 3. Slate Rough
fs.writeFileSync(
  path.join(dir, 'slate_rough.png'),
  createPng(256, 256, (x, y) => {
    let val = 0.5;
    val += Math.sin(y * 2 * Math.PI / 64) * 0.15;
    val += Math.sin(y * 2 * Math.PI / 16 + x * 2 * Math.PI / 256) * 0.1;
    val += Math.sin(y * 2 * Math.PI / 8) * 0.05;
    val += Math.cos(x * 2 * Math.PI / 8) * Math.sin(y * 2 * Math.PI / 8) * 0.05;
    val += Math.sin(x * 2 * Math.PI / 4) * Math.cos(y * 2 * Math.PI / 4) * 0.03;
    return Math.max(0, Math.min(255, Math.floor(val * 255)));
  })
);

// 4. Fine Sand
fs.writeFileSync(
  path.join(dir, 'fine_sand.png'),
  createPng(256, 256, (x, y) => {
    let val = 0.5;
    val += Math.sin(x * 2 * Math.PI / 6) * Math.cos(y * 2 * Math.PI / 6) * 0.15;
    val += Math.sin(x * 2 * Math.PI / 3 + 0.2) * Math.sin(y * 2 * Math.PI / 3 + 1.1) * 0.1;
    val += Math.sin(x * 2 * Math.PI / 2 + 0.9) * Math.sin(y * 2 * Math.PI / 2 + 0.4) * 0.05;
    return Math.max(0, Math.min(255, Math.floor(val * 255)));
  })
);

console.log("Procedural seamless grayscale textures generated successfully!");
