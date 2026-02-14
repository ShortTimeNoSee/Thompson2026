const fs = require('fs');
const path = require('path');
const https = require('https');

const PDF_LIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const DEST_PATH = path.resolve(__dirname, '../_site/js/vendor/pdf-lib.min.js');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    ensureDirSync(path.dirname(destPath));
    const file = fs.createWriteStream(destPath);
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

(async () => {
  try {
    if (fs.existsSync(DEST_PATH)) {
      console.log('pdf-lib already cached');
      return;
    }
    
    console.log('Downloading pdf-lib...');
    await downloadFile(PDF_LIB_URL, DEST_PATH);
    console.log('✓ pdf-lib localized to /js/vendor/pdf-lib.min.js');
  } catch (error) {
    console.error('Failed to download pdf-lib:', error.message);
    process.exitCode = 1;
  }
})();

