const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');

const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.map'
]);

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function shouldCompress(file) {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) return false;
  if (file.endsWith('.br') || file.endsWith('.gz')) return false;
  return true;
}

function compressBrotli(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    const brotli = zlib.createBrotliCompress({
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11
      }
    });
    input.pipe(brotli).pipe(output).on('finish', resolve).on('error', reject);
  });
}

function compressGzip(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
    input.pipe(gzip).pipe(output).on('finish', resolve).on('error', reject);
  });
}

(async () => {
  try {
    let filesProcessed = 0;
    for (const file of walk(SITE_DIR)) {
      if (!shouldCompress(file)) continue;
      const br = `${file}.br`;
      const gz = `${file}.gz`;
      try {
        if (!fs.existsSync(br)) await compressBrotli(file, br);
        if (!fs.existsSync(gz)) await compressGzip(file, gz);
        filesProcessed++;
      } catch (e) {
        // continue on error
      }
    }
    console.log(`Precompression complete (${filesProcessed} files)`);
  } catch (e) {
    console.error('Precompression failed:', e.message);
    process.exitCode = 1;
  }
})();


