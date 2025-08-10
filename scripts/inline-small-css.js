/*
  Inline small per-page CSS to eliminate render-blocking request on critical pages.
  - Looks in _site/dist/page-css/*.css
  - If CSS size <= 12KB, finds matching HTML and inlines before </head>
  - Removes preload/stylesheet tags to the same CSS
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const PAGE_CSS_DIR = path.join(SITE_DIR, 'dist', 'page-css');
const zlib = require('zlib');
const RAW_SIZE_THRESHOLD = 12 * 1024; // 12KB uncompressed fallback
const BROTLI_SIZE_THRESHOLD = 10 * 1024; // 10KB transfer-equivalent

function getHtmlForCss(cssFile) {
  // Handles names like: index.css, blog_index.css, declaration_of_war_index.css
  const base = path.basename(cssFile, '.css');
  if (base === 'index') {
    const p = path.join(SITE_DIR, 'index.html');
    return fs.existsSync(p) ? p : null;
  }
  if (base.endsWith('_index')) {
    const dir = base.slice(0, -('_index'.length));
    const p = path.join(SITE_DIR, dir, 'index.html');
    return fs.existsSync(p) ? p : null;
  }
  // Fallback: treat entire base as a directory name (rare)
  const p = path.join(SITE_DIR, base, 'index.html');
  return fs.existsSync(p) ? p : null;
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

(async () => {
  try {
    if (!fs.existsSync(PAGE_CSS_DIR)) return;
    const files = fs.readdirSync(PAGE_CSS_DIR).filter(f => f.endsWith('.css'));
    let inlined = 0;

    for (const f of files) {
      const full = path.join(PAGE_CSS_DIR, f);
      const stat = fs.statSync(full);
      let shouldInline = stat.size <= RAW_SIZE_THRESHOLD;
      if (!shouldInline) {
        try {
          const css = fs.readFileSync(full);
          const br = zlib.brotliCompressSync(css, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
          });
          shouldInline = br.length <= BROTLI_SIZE_THRESHOLD;
        } catch {}
      }
      if (!shouldInline) continue;

      const htmlPath = getHtmlForCss(f);
      if (!htmlPath) continue;

      let html = fs.readFileSync(htmlPath, 'utf8');
      const css = fs.readFileSync(full, 'utf8');
      const webPath = `/dist/page-css/${f}`;
      const escapedWebPath = escapeForRegex(webPath);

      // Remove preload and stylesheet for this CSS.
      const preloadRe = new RegExp(
        `<link(?=[^>]*rel=("|')preload\\1)(?=[^>]*href=("|')${escapedWebPath}\\2)[^>]*>`,
        'ig'
      );
      html = html.replace(preloadRe, '');

      const stylesheetRe = new RegExp(
        `<link[^>]*rel=("|')stylesheet\\1[^>]*href=("|')${escapedWebPath}\\2[^>]*\\/?\\s*>`,
        'ig'
      );
      html = html.replace(stylesheetRe, '');

      // Inline before </head>
      html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
      fs.writeFileSync(htmlPath, html);
      inlined++;
    }

    console.log(`Inlined small per-page CSS (${inlined} pages)`);
  } catch (e) {
    console.error('Inline small CSS failed:', e.message);
    process.exitCode = 1;
  }
})();
