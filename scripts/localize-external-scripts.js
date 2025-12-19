const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');

const TARGETS = [
  {
    pattern: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/dompurify\/[0-9.]+\/purify\.min\.js/g,
    localPath: '/js/vendor/purify.min.js',
  },
];

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function findHtmlFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findHtmlFiles(full));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function fetchToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    ensureDirSync(path.dirname(destPath));
    const file = fs.createWriteStream(destPath);
    https
      .get(url, res => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', reject);
  });
}

(async () => {
  try {
    const files = findHtmlFiles(SITE_DIR);
    let updatedFiles = 0;
    for (const file of files) {
      let html = fs.readFileSync(file, 'utf8');
      let changed = false;
      for (const { pattern, localPath } of TARGETS) {
        const match = html.match(pattern);
        if (match && match.length) {
          const url = match[0];
          const diskPath = path.join(SITE_DIR, localPath);
          if (!fs.existsSync(diskPath)) {
            try {
              await fetchToFile(url, diskPath);
              process.stdout.write('+');
            } catch (e) {
              console.error(`\nFailed to localize ${url}: ${e.message}`);
              continue;
            }
          }
          html = html.replace(pattern, localPath);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(file, html);
        updatedFiles++;
      }
    }
    console.log(`\nExternal scripts localized (${updatedFiles} files updated)`);
  } catch (e) {
    console.error('External script localization failed:', e.message);
    process.exitCode = 1;
  }
})();


