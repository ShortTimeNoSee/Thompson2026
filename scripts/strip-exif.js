/*
  Strips EXIF/metadata and recompresses images in _site/resources in-place.
*/
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, '_site', 'resources');

// Focus on JPEG/PNG where EXIF/metadata matters; skip WebP/AVIF
const supportedExt = new Set(['.jpg', '.jpeg', '.png']);

async function optimizeFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const image = sharp(filePath, { failOnError: false });

    let buffer;
    if (ext === '.jpg' || ext === '.jpeg') {
      buffer = await image.jpeg({ quality: 82, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
    } else if (ext === '.png') {
      buffer = await image.png({ compressionLevel: 9, palette: true }).toBuffer();
    } else {
      return;
    }

    await fs.promises.writeFile(filePath, buffer);
    process.stdout.write('.');
  } catch (err) {
    console.error(`\nImage optimize failed for ${filePath}:`, err.message);
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
    console.log('Image optimization complete');
  } catch (e) {
    console.error('strip-exif failed:', e);
    process.exitCode = 1;
  }
})();


