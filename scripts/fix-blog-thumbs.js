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
    // Add loading=lazy and fetchpriority=high for hero portrait on homepage only handled in template; here ensure lazy for blog thumbs
    html = html.replace(/<img([^>]*?)class="post-card-image"([^>]*?)>/g, (m, pre, post) => {
      let tag = `<img${pre}class="post-card-image"${post}>`;
      if (!/loading=/.test(tag)) tag = tag.replace('<img', '<img loading="lazy"');
      if (!/decoding=/.test(tag)) tag = tag.replace('<img', '<img decoding="async"');
      if (!/sizes=/.test(tag) && /srcset=/.test(tag)) {
        tag = tag.replace('<img', '<img sizes="(max-width: 640px) 320px, (max-width: 960px) 640px, (max-width: 1280px) 960px, 1200px"');
      }
      return tag;
    });
    if (html !== before) { fs.writeFileSync(file, html); updated++; }
  }
  console.log(`Blog thumbnails normalized (${updated} files updated)`);
})();


