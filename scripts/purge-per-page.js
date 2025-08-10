// Generate per-page purged CSS and rewrite each built HTML to use its own CSS file.
// - Reads base CSS from dist/styles.min.css
// - For each built HTML page, runs PurgeCSS with that page + all built JS as content
// - Writes CSS to dist/page-css/<relative_path>.css
// - Rewrites preload/stylesheet links in that HTML to the per-page CSS
const fs = require('fs');
const path = require('path');
const { PurgeCSS } = require('purgecss');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const DIST_DIR = path.join(ROOT, 'dist');
const BASE_CSS_PATH = path.join(DIST_DIR, 'styles.min.css');
const OUT_DIR = path.join(DIST_DIR, 'page-css');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

function findFiles(dir, ext) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findFiles(full, ext));
    else if (full.endsWith(ext)) out.push(full);
  }
  return out;
}

(async () => {
  try {
    if (!fs.existsSync(BASE_CSS_PATH) || !fs.existsSync(SITE_DIR)) {
      console.log('Skipping per-page CSS (missing base css or site dir)');
      return;
    }
    ensureDir(OUT_DIR);

    // Load safelist if present in purgecss.config.cjs
    let safelist = undefined;
    try {
      const cfg = require(path.join(ROOT, 'purgecss.config.cjs'));
      safelist = cfg.safelist;
    } catch {}

    const baseCss = fs.readFileSync(BASE_CSS_PATH, 'utf8');
    const jsFiles = findFiles(SITE_DIR, '.js');
    const htmlFiles = findFiles(SITE_DIR, '.html');

    let updated = 0;
    for (const htmlPath of htmlFiles) {
      const purge = await new PurgeCSS().purge({
        content: [htmlPath, ...jsFiles],
        css: [{ raw: baseCss }],
        safelist,
      });
      const pageCss = purge[0]?.css || '';
      // Write CSS to out path named after the page path
      const rel = path.relative(SITE_DIR, htmlPath).replace(/\\/g, '/');
      const name = rel.replace(/\//g, '_').replace(/\.html$/, '') + '.css';
      const outPath = path.join(OUT_DIR, name);
      fs.writeFileSync(outPath, pageCss);

      // Rewrite HTML links to use page CSS
      let html = fs.readFileSync(htmlPath, 'utf8');
      const webPath = '/' + path.relative(ROOT, outPath).replace(/\\/g, '/');
      html = html.replace(/<link[^>]*rel="preload"[^>]*as="style"[^>]*href="[^"]*styles\.min[^>]*>/i, `<link rel="preload" href="${webPath}" as="style">`);
      html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="[^"]*styles\.min[^>]*>/i, `<link rel="stylesheet" href="${webPath}">`);
      fs.writeFileSync(htmlPath, html);
      updated++;
    }
    console.log(`Per-page CSS generated (${updated} pages)`);
  } catch (e) {
    console.error('Per-page CSS generation failed:', e.message);
    process.exitCode = 1;
  }
})();


