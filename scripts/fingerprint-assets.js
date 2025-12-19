const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
}

function replaceInHtml(filePath, replacements) {
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (re.test(html)) {
      html = html.replace(re, to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, html);
  return changed;
}

function processDir(dir) {
  const htmlFiles = [];
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.html')) htmlFiles.push(full);
    }
  };
  walk(dir);
  return htmlFiles;
}

(async () => {
  try {
    const targets = [
      { dir: path.join(SITE_DIR, 'dist'), exts: ['.css', '.js'] },
      { dir: path.join(SITE_DIR, 'js'), exts: ['.js'] },
    ];
    const replacements = [];

    for (const { dir, exts } of targets) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (!exts.includes(ext)) continue;
        const full = path.join(dir, f);
        const hash = hashFile(full);
        if (/\.[a-f0-9]{8}\.[a-z]+$/.test(f)) continue;
        const fingerprinted = f.replace(ext, `.${hash}${ext}`);
        const dest = path.join(dir, fingerprinted);
        if (!fs.existsSync(dest)) fs.copyFileSync(full, dest);
        replacements.push([`/${path.relative(SITE_DIR, full).replace(/\\/g, '/')}`, `/${path.relative(SITE_DIR, dest).replace(/\\/g, '/')}`]);
      }
    }

    const htmlFiles = processDir(SITE_DIR);
    let changedCount = 0;
    for (const html of htmlFiles) {
      if (replaceInHtml(html, replacements)) changedCount++;
    }
    console.log(`Fingerprinting complete. Updated ${changedCount} HTML files.`);
  } catch (e) {
    console.error('Fingerprinting failed:', e.message);
    process.exitCode = 1;
  }
})();


