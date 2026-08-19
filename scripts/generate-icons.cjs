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

/**
 * Render the Payroll HR ERP payslip badge icon
 * Exact visual recreation:
 * - Rounded square outer badge: Vibrant Royal Blue (#1565C0 -> #0D47A1)
 * - Inside: White document / payslip card with subtle rounded corners
 * - Top of document: Solid blue header band (#1976D2)
 * - Middle: 3 horizontal salary/item line rules (#90CAF9 / #64B5F6)
 * - Bottom of document: Crisp Peso symbol (₱) with double horizontal crossbar
 */
function renderPayrollIcon(size) {
  const width = size;
  const height = size;
  const rawRows = [];

  const cx0 = width / 2;
  const cy0 = height / 2;

  // Badge parameters
  const badgeCorner = width * 0.22;
  const badgeHalf = width * 0.46;

  // Document parameters
  const docLeft = cx0 - width * 0.30;
  const docRight = cx0 + width * 0.30;
  const docTop = cy0 - height * 0.34;
  const docBottom = cy0 + height * 0.34;
  const docCorner = width * 0.08;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const cx = x - cx0;
      const cy = y - cy0;

      // 1. Outer rounded rectangle (Badge)
      const bdx = Math.max(0, Math.abs(cx) - (badgeHalf - badgeCorner));
      const bdy = Math.max(0, Math.abs(cy) - (badgeHalf - badgeCorner));
      const bDist = Math.sqrt(bdx * bdx + bdy * bdy);

      let r = 0, g = 0, b = 0, a = 0;

      if (bDist <= badgeCorner) {
        // Antialiasing edge
        const edgeDist = badgeCorner - bDist;
        const alphaFactor = Math.min(1, Math.max(0, edgeDist * 2));
        a = Math.round(255 * alphaFactor);

        // Blue Gradient: #1E88E5 at top to #0D47A1 at bottom
        const t = y / height;
        r = Math.round(25 - t * 12);
        g = Math.round(118 - t * 47);
        b = Math.round(210 - t * 49);

        // 2. Inner Document / Payslip Card
        const docCx = cx;
        const docCy = cy;
        const docHalfW = (docRight - docLeft) / 2;
        const docHalfH = (docBottom - docTop) / 2;

        const ddx = Math.max(0, Math.abs(docCx) - (docHalfW - docCorner));
        const ddy = Math.max(0, Math.abs(docCy) - (docHalfH - docCorner));
        const dDist = Math.sqrt(ddx * ddx + ddy * ddy);

        if (dDist <= docCorner) {
          // Inside White Document
          r = 255;
          g = 255;
          b = 255;

          // A. Top Header band (Blue)
          const relY = y / height;
          const relX = x / width;

          if (relY >= 0.23 && relY <= 0.32 && relX >= 0.28 && relX <= 0.72) {
            r = 13; g = 71; b = 161; // #0D47A1
          }

          // B. Document Line 1 (Payroll text line)
          if (relY >= 0.41 && relY <= 0.44 && relX >= 0.30 && relX <= 0.70) {
            r = 144; g = 202; b = 249; // #90CAF9
          }

          // C. Document Line 2 (Deductions line)
          if (relY >= 0.51 && relY <= 0.54 && relX >= 0.30 && relX <= 0.70) {
            r = 144; g = 202; b = 249;
          }

          // D. Document Line 3 (Net pay line)
          if (relY >= 0.61 && relY <= 0.64 && relX >= 0.30 && relX <= 0.70) {
            r = 144; g = 202; b = 249;
          }

          // E. Peso symbol (₱) at bottom center of document
          // Vertical stem of P
          if (relX >= 0.44 && relX <= 0.48 && relY >= 0.70 && relY <= 0.82) {
            r = 13; g = 71; b = 161; // Dark Blue
          }
          // Loop of P
          if (relX >= 0.47 && relX <= 0.56 && relY >= 0.70 && relY <= 0.77) {
            const loopCx = (0.50);
            const loopCy = (0.735);
            const lDist = Math.hypot((relX - loopCx)*1.2, relY - loopCy);
            if (lDist <= 0.042 && lDist >= 0.015) {
              r = 13; g = 71; b = 161;
            }
          }
          // Peso crossbars (2 horizontal lines through P stem)
          if ((relY >= 0.725 && relY <= 0.740 || relY >= 0.755 && relY <= 0.770) && relX >= 0.39 && relX <= 0.53) {
            r = 13; g = 71; b = 161;
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

/**
 * Create a modern Windows ICO file with exact specified layer sizes
 */
function createWindowsIco(layerEntries) {
  const count = layerEntries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved (must be 0)
  header.writeUInt16LE(1, 2);     // Resource Type 1 = Icon (.ico)
  header.writeUInt16LE(count, 4); // Number of image frames

  let currentOffset = 6 + count * 16;
  const directoryEntries = [];
  const imageBuffers = [];

  for (const item of layerEntries) {
    const entry = Buffer.alloc(16);
    entry[0] = item.size >= 256 ? 0 : item.size; // Width (0 indicates 256px)
    entry[1] = item.size >= 256 ? 0 : item.size; // Height (0 indicates 256px)
    entry[2] = 0; // Color count (0 = 256+ colors)
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4);  // Color planes (1)
    entry.writeUInt16LE(32, 6); // Bits per pixel (32-bit truecolor RGBA)
    entry.writeUInt32LE(item.buf.length, 8); // Size of PNG/RGB data in bytes
    entry.writeUInt32LE(currentOffset, 12);  // Offset from start of ICO file

    directoryEntries.push(entry);
    imageBuffers.push(item.buf);
    currentOffset += item.buf.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
}

function buildAllPayrollIcons() {
  const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Generating Payroll HR ERP icons...');

  // Required ICO layers: 16x16, 24x24, 32x32, 48x48, 64x64, 256x256
  const requiredIcoSizes = [16, 24, 32, 48, 64, 256];
  const icoLayers = [];

  for (const size of requiredIcoSizes) {
    const pngBuf = renderPayrollIcon(size);
    icoLayers.push({ size, buf: pngBuf });
  }

  // 1. Generate the modern icon.ico file containing all 6 required layers
  const icoData = createWindowsIco(icoLayers);
  const icoPath = path.join(iconsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoData);
  console.log(`Generated: ${icoPath} (${icoData.length} bytes, layers: ${requiredIcoSizes.join(', ')})`);

  // 2. Generate standard companion PNG files for Tauri
  const pngSizes = {
    '32x32.png': 32,
    '128x128.png': 128,
    '128x128@2x.png': 256,
    'icon.png': 512,
    'Square30x30Logo.png': 30,
    'Square44x44Logo.png': 44,
    'Square71x71Logo.png': 71,
    'Square89x89Logo.png': 89,
    'Square107x107Logo.png': 107,
    'Square142x142Logo.png': 142,
    'Square150x150Logo.png': 150,
    'Square284x284Logo.png': 284,
    'Square310x310Logo.png': 310,
    'StoreLogo.png': 50
  };

  for (const [filename, size] of Object.entries(pngSizes)) {
    const pngBuf = renderPayrollIcon(size);
    fs.writeFileSync(path.join(iconsDir, filename), pngBuf);
  }

  console.log('All Payroll HR ERP icons updated successfully.');
}

buildAllPayrollIcons();
