const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(width, height) {
  const rawRows = [];
  const cx0 = width / 2;
  const cy0 = height / 2;
  const cornerR = width * 0.22;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: None
    
    for (let x = 0; x < width; x++) {
      const cx = x - cx0;
      const cy = y - cy0;
      
      // Rounded rect test
      const dx = Math.max(0, Math.abs(cx) - (cx0 - cornerR - 1));
      const dy = Math.max(0, Math.abs(cy) - (cy0 - cornerR - 1));
      const distFromCorner = Math.sqrt(dx * dx + dy * dy);

      let r = 15, g = 23, b = 42, a = 255; // Slate 900 #0f172a

      if (distFromCorner > cornerR) {
        a = 0; // Transparent
      } else {
        // Deep Indigo/Blue gradient background
        const t = y / height;
        r = Math.round(15 + t * 20);  // 15 -> 35
        g = Math.round(30 + t * 50);  // 30 -> 80
        b = Math.round(80 + t * 140); // 80 -> 220
        
        // Inner gold badge (Payroll emblem)
        const radius = Math.sqrt(cx * cx + cy * cy);
        if (radius < width * 0.36 && radius > width * 0.32) {
          // Gold border ring
          r = 245; g = 158; b = 11; // Amber 500
        } else if (radius <= width * 0.32) {
          // Central emblem: White / Gold geometric glyph
          if (Math.abs(cx) < width * 0.18 && Math.abs(cy) < width * 0.20) {
            // Horizontal and vertical bars of ERP/Dollar mark
            const inVBar = Math.abs(cx) < width * 0.06;
            const inHBar = Math.abs(cy) < width * 0.05 || Math.abs(cy - width*0.1) < width * 0.04 || Math.abs(cy + width*0.1) < width * 0.04;
            
            if (inVBar || inHBar) {
              r = 255; g = 255; b = 255; // White
            } else {
              r = 30; g = 58; b = 138; // Contrast Indigo
            }
          }
        }
      }

      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const idatData = zlib.deflateSync(rawData);

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // 8-bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeIco(pngEntries) {
  const count = pngEntries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type 1 = Icon (.ico)
  header.writeUInt16LE(count, 4); // Number of images

  let currentOffset = 6 + count * 16;
  const directoryEntries = [];
  const imageBuffers = [];

  for (const item of pngEntries) {
    const entry = Buffer.alloc(16);
    entry[0] = item.size >= 256 ? 0 : item.size; // Width (0 means 256)
    entry[1] = item.size >= 256 ? 0 : item.size; // Height (0 means 256)
    entry[2] = 0; // Color count (0 for 256+ colors)
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buf.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data

    directoryEntries.push(entry);
    imageBuffers.push(item.buf);
    currentOffset += item.buf.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
}

function makeIcns(pngEntriesMap) {
  // ICNS container with PNG-encoded entries
  // Type mapping for ICNS
  const typeMap = {
    16: 'icp4',
    32: 'icp5',
    64: 'icp6',
    128: 'ic07',
    256: 'ic08',
    512: 'ic09',
    1024: 'ic10'
  };

  const chunks = [];
  let totalLength = 8; // 'icns' (4) + length (4)

  for (const item of pngEntriesMap) {
    const ostype = typeMap[item.size];
    if (ostype) {
      const typeBuf = Buffer.from(ostype, 'ascii');
      const lenBuf = Buffer.alloc(4);
      const chunkLen = 8 + item.buf.length;
      lenBuf.writeUInt32BE(chunkLen, 0);
      chunks.push(Buffer.concat([typeBuf, lenBuf, item.buf]));
      totalLength += chunkLen;
    }
  }

  const magic = Buffer.from('icns', 'ascii');
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(totalLength, 0);

  return Buffer.concat([magic, sizeBuf, ...chunks]);
}

function generateAllIcons() {
  const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Generating pristine PNGs and modern ICO/ICNS...');

  const resolutions = [16, 30, 32, 44, 48, 50, 64, 71, 89, 107, 128, 142, 150, 256, 284, 310, 512];
  const pngCache = {};

  for (const s of resolutions) {
    pngCache[s] = makePng(s, s);
  }

  // Standard Tauri Icons
  fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngCache[32]);
  fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngCache[128]);
  fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngCache[256]);
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngCache[512]);

  // Windows Store / App tiles
  fs.writeFileSync(path.join(iconsDir, 'Square30x30Logo.png'), pngCache[30]);
  fs.writeFileSync(path.join(iconsDir, 'Square44x44Logo.png'), pngCache[44]);
  fs.writeFileSync(path.join(iconsDir, 'Square71x71Logo.png'), pngCache[71]);
  fs.writeFileSync(path.join(iconsDir, 'Square89x89Logo.png'), pngCache[89]);
  fs.writeFileSync(path.join(iconsDir, 'Square107x107Logo.png'), pngCache[107]);
  fs.writeFileSync(path.join(iconsDir, 'Square142x142Logo.png'), pngCache[142]);
  fs.writeFileSync(path.join(iconsDir, 'Square150x150Logo.png'), pngCache[150]);
  fs.writeFileSync(path.join(iconsDir, 'Square284x284Logo.png'), pngCache[284]);
  fs.writeFileSync(path.join(iconsDir, 'Square310x310Logo.png'), pngCache[310]);
  fs.writeFileSync(path.join(iconsDir, 'StoreLogo.png'), pngCache[50]);

  // Modern multi-resolution PNG-encoded ICO (Supported natively by Windows Resource Compiler RC.EXE)
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoEntries = icoSizes.map(s => ({ size: s, buf: pngCache[s] }));
  const icoData = makeIco(icoEntries);
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoData);

  // Modern ICNS
  const icnsSizes = [16, 32, 64, 128, 256, 512];
  const icnsEntries = icnsSizes.map(s => ({ size: s, buf: pngCache[s] }));
  const icnsData = makeIcns(icnsEntries);
  fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icnsData);

  console.log('Successfully generated all icons!');
}

generateAllIcons();
