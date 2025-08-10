/*
  Strips EXIF/metadata and recompresses images in _site/resources in-place.
*/
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, '_site', 'resources');

// Optimize local JPEG/PNG only; WebP/AVIF are already optimized
const supportedExt = new Set(['.jpg', '.jpeg', '.png']);

let optimized = 0;
let skipped = 0;

async function optimizeFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const image = sharp(filePath, { failOnError: false });

    let buffer;
    if (ext === '.jpg' || ext === '.jpeg') {
      buffer = await image.jpeg({ quality: 82, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
    } else if (ext === '.png') {
      buffer = await image.png({ compressionLevel: 9, palette: true }).toBuffer();
    } else if (ext === '.webp') {
      buffer = await image.webp({ quality: 75 }).toBuffer();
    } else {
      return;
    }

    await fs.promises.writeFile(filePath, buffer);
    optimized++;
  } catch (err) {
    // On Windows or CI, files can be transiently locked; skip quietly
    skipped++;
  }
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (supportedExt.has(path.extname(entry.name).toLowerCase())) {
      await optimizeFile(full);
    }
  }
}

(async () => {
  try {
    if (!fs.existsSync(TARGET_DIR)) {
      console.log('No resources directory in build; skipping EXIF strip');
      return;
    }
    await walk(TARGET_DIR);
    console.log(`Image optimization complete (${optimized} optimized, ${skipped} skipped)`);
  } catch (e) {
    console.error('strip-exif failed:', e);
    process.exitCode = 1;
  }
})();


