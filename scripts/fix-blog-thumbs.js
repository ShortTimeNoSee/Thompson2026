const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');

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
  const files = findHtmlFiles(SITE_DIR);
  let updated = 0;
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    const isHome = /\\_site\\index\.html$/.test(file) || /\/_site\/index\.html$/.test(file);
    const isBlogIndex = /\\_site\\blog\\index\.html$/.test(file) || /\/_site\/blog\/index\.html$/.test(file);
    const sizesHome = '(max-width: 480px) 200px, 322px';
    const sizesBlog = '322px';
    const sizesDefault = '(max-width: 640px) 320px, (max-width: 960px) 640px, (max-width: 1280px) 960px, 1200px';

    // Add loading/decoding and normalize sizes for post-card-image
    html = html.replace(/<img([^>]*?)class="post-card-image"([^>]*?)>/g, (m, pre, post) => {
      let tag = `<img${pre}class="post-card-image"${post}>`;
      if (!/loading=/.test(tag)) tag = tag.replace('<img', '<img loading="lazy"');
      if (!/decoding=/.test(tag)) tag = tag.replace('<img', '<img decoding="async"');
      const desired = isHome ? sizesHome : isBlogIndex ? sizesBlog : sizesDefault;
      if (/srcset=/.test(tag)) {
        if (/sizes=/.test(tag)) {
          tag = tag.replace(/sizes=("|')[^"']*(\1)/, `sizes="${desired}"`);
        } else {
          tag = tag.replace('<img', `<img sizes="${desired}"`);
        }
      }
      return tag;
    });

    if (html !== before) { fs.writeFileSync(file, html); updated++; }
  }
  console.log(`Blog thumbnails normalized (${updated} files updated)`);
})();


