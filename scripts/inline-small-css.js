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
const SIZE_THRESHOLD = 12 * 1024; // 12KB

function getHtmlForCss(cssFile) {
  // cssFile names are like blog_index.css, issues_index.css, index.css, etc.
  const base = path.basename(cssFile, '.css');
  const parts = base.split('_');
  let htmlPath;
  if (parts.length === 1) {
    // index.css => _site/index.html
    htmlPath = path.join(SITE_DIR, `${base}.html`);
  } else {
    const dir = parts[0];
    htmlPath = path.join(SITE_DIR, dir, 'index.html');
  }
  return fs.existsSync(htmlPath) ? htmlPath : null;
}

(async () => {
  try {
    if (!fs.existsSync(PAGE_CSS_DIR)) return;
    const files = fs.readdirSync(PAGE_CSS_DIR).filter(f => f.endsWith('.css'));
    let inlined = 0;
    for (const f of files) {
      const full = path.join(PAGE_CSS_DIR, f);
      const stat = fs.statSync(full);
      if (stat.size > SIZE_THRESHOLD) continue;
      const htmlPath = getHtmlForCss(f);
      if (!htmlPath) continue;
      let html = fs.readFileSync(htmlPath, 'utf8');
      const css = fs.readFileSync(full, 'utf8');
      const webPath = `/dist/page-css/${f}`;
      // Remove preload and stylesheet for this CSS
      const preloadRe = new RegExp(`<link[^>]*rel=("|')preload\1[^>]*as=("|')style\2[^>]*href=("|')${webPath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\3[^>]*>`, 'ig');
      html = html.replace(preloadRe, '');
      const stylesheetRe = new RegExp(`<link[^>]*rel=("|')stylesheet\1[^>]*href=("|')${webPath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\2[^>]*>`, 'i');
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


