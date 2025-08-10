/*
  Downloads external Unsplash images referenced in built HTML, converts to WebP,
  saves under _site/resources/external, and rewrites HTML to local paths.
*/
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const OUT_DIR = path.join(SITE_DIR, 'resources', 'external');

const URL_REGEX = /(https:\/\/images\.unsplash\.com\/[A-Za-z0-9_\-./?=&%]+)/g;

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function processUrl(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12);
  const outPath = path.join(OUT_DIR, `${hash}.webp`);
  const outHref = `/resources/external/${hash}.webp`;
  if (!fs.existsSync(outPath)) {
    try {
      console.log(`Downloading external image: ${url}`);
      const buf = await fetchBuffer(url);
      // Generate responsive sizes and a baseline
      const meta = await sharp(buf).metadata();
      const targetWidths = [320, 640, 960, 1200].filter(w => !meta.width || w <= meta.width);
      const srcsetParts = [];
      for (const w of targetWidths) {
        const sizedName = `${hash}-${w}.webp`;
        const sizedPath = path.join(OUT_DIR, sizedName);
        if (!fs.existsSync(sizedPath)) {
          const resized = await sharp(buf).resize({ width: w }).webp({ quality: 76 }).toBuffer();
          await fs.promises.writeFile(sizedPath, resized);
        }
        srcsetParts.push(`/resources/external/${sizedName} ${w}w`);
      }
      const largest = targetWidths[targetWidths.length - 1] || 1200;
      const webp = await sharp(buf).resize({ width: largest }).webp({ quality: 76 }).toBuffer();
      await fs.promises.writeFile(outPath, webp);
      await fs.promises.writeFile(path.join(OUT_DIR, `${hash}.json`), JSON.stringify({ src: outHref, srcset: srcsetParts.join(', ') }));
      console.log(`✓ Localized: ${hash}.webp`);
      process.stdout.write('+');
    } catch (e) {
      console.error(`\nFailed to localize ${url}:`, e.message);
      return null;
    }
  }
  return outHref;
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

(async () => {
  ensureDirSync(OUT_DIR);
  const files = findHtmlFiles(SITE_DIR);
  const cache = new Map();
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const urls = Array.from(html.matchAll(URL_REGEX)).map(m => m[1]);
    if (urls.length === 0) continue;
    let changed = false;
    for (const url of urls) {
      if (!cache.has(url)) cache.set(url, await processUrl(url));
      const localHref = cache.get(url);
      if (localHref) {
        const esc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(esc, 'g');
        html = html.replace(re, localHref);
        try {
          const hash = localHref.match(/([a-f0-9]{12})/)[1];
          const sidecar = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `${hash}.json`), 'utf8'));
          html = html.replace(new RegExp(`<img([^>]*?)src="${localHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*?)>`, 'g'), (m, pre, post) => {
            if (/srcset=/.test(m)) return m;
            // ensure sizes attribute for responsive selection
            return `<img${pre}src="${sidecar.src}" srcset="${sidecar.srcset}" sizes="(max-width: 640px) 320px, (max-width: 960px) 640px, (max-width: 1280px) 960px, 1200px"${post}>`;
          });
        } catch {}
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, html);
      process.stdout.write('.');
    }
  }
  console.log('\nExternal images localized');
})();


