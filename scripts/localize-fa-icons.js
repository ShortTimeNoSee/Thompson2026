/*
  Downloads Font Awesome SVGs for all fa- icons found in HTML,
  stores them locally, and replaces <i> tags with inline SVG.
  Removes FA CSS dependency entirely in production.
*/
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const FA_CACHE_PARENT = path.join(ROOT, '_site', 'resources');
const FA_CACHE_DIR = path.join(FA_CACHE_PARENT, '.fa-cache');

// FA CDN endpoints for SVG downloads (use tight SVGs without extra padding)
const FA_SVG_BASE = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.x/svgs';
const STYLE_MAP = {
  'fas': 'solid',
  'fa-solid': 'solid',
  'far': 'regular', 
  'fa-regular': 'regular',
  'fab': 'brands',
  'fa-brands': 'brands'
};

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function downloadFaSvg(iconName, style = 'solid') {
  const cacheKey = `${style}-${iconName}`;
  const cachePath = path.join(FA_CACHE_DIR, `${cacheKey}.svg`);
  
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  
  const url = `${FA_SVG_BASE}/${style}/${iconName}.svg`;
  try {
    const svg = await fetchText(url);
    ensureDirSync(FA_CACHE_DIR);
    fs.writeFileSync(cachePath, svg);
    console.log(`✓ Downloaded ${iconName} (${style})`);
    return svg;
  } catch (e) {
    console.log(`✗ Failed ${iconName} (${style}): ${e.message}`);
    const fallbacks = ['solid', 'regular', 'brands'].filter(s => s !== style);
    for (const fallback of fallbacks) {
      try {
        const fallbackUrl = `${FA_SVG_BASE}/${fallback}/${iconName}.svg`;
        const svg = await fetchText(fallbackUrl);
        ensureDirSync(FA_CACHE_DIR);
        fs.writeFileSync(cachePath, svg);
        console.log(`✓ Downloaded ${iconName} (${fallback}) as fallback`);
        return svg;
      } catch (fallbackE) {
        console.log(`✗ Fallback failed ${iconName} (${fallback}): ${fallbackE.message}`);
        continue;
      }
    }
    throw new Error(`Could not download ${iconName} in any style`);
  }
}

function processSvg(rawSvg, iconName, attributes = {}) {
  let svg = rawSvg;
  
  // Add accessibility attributes
  if (!svg.includes('aria-hidden') && !attributes['aria-label']) {
    svg = svg.replace('<svg', '<svg aria-hidden="true"');
  }
  if (attributes['aria-label']) {
    svg = svg.replace('<svg', `<svg aria-label="${attributes['aria-label']}"`);
    svg = svg.replace('aria-hidden="true"', '');
  }
  
  // Ensure currentColor for styling flexibility (except RSS which has specific color)
  if (!svg.includes('fill=') && iconName !== 'rss') {
    svg = svg.replace('<svg', '<svg fill="currentColor"');
  } else if (iconName === 'rss' && !svg.includes('fill=')) {
    svg = svg.replace('<svg', '<svg fill="#ffa044"');
  }
  
  // Add default sizing in em to scale with font-size
  if (!svg.includes('width=')) {
    svg = svg.replace('<svg', '<svg width="1em" height="1em"');
  }

  // Preserve original classes for styling hooks
  if (attributes.class) {
    if (svg.includes(' class="')) {
      svg = svg.replace(' class="', ` class="fa-svg ${attributes.class} `);
    } else {
      svg = svg.replace('<svg', `<svg class="fa-svg ${attributes.class}"`);
    }
  } else {
    // Ensure we at least tag the svg for generic styling
    if (!svg.includes(' class="')) {
      svg = svg.replace('<svg', '<svg class="fa-svg"');
    }
  }
  
  return svg;
}

function extractFaIcons(html) {
  const icons = new Set();
  const regex = /<i[^>]*class="([^"]*\bfa[^"]*)"[^>]*><\/i>/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const classes = match[1].split(/\s+/);
    const styleClass = classes.find(c => Object.keys(STYLE_MAP).includes(c)) || 'fas';
    const iconClass = classes.find(c => c.startsWith('fa-') && !Object.keys(STYLE_MAP).includes(c));
    
    if (iconClass) {
      const iconName = iconClass.replace(/^fa-/, '');
      const style = STYLE_MAP[styleClass] || 'solid';
      icons.add(`${style}:${iconName}`);
    }
  }
  
  return Array.from(icons);
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

async function replaceIconsInFile(filePath, iconCache) {
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  html = html.replace(/<i([^>]*?)class="([^"]*\bfa[^"]*)"([^>]*)><\/i>/g, (match, pre, classStr, post) => {
    const classes = classStr.split(/\s+/);
    const styleClass = classes.find(c => Object.keys(STYLE_MAP).includes(c)) || 'fas';
    const iconClass = classes.find(c => c.startsWith('fa-') && !Object.keys(STYLE_MAP).includes(c));
    
    if (!iconClass) return match;
    
    const iconName = iconClass.replace(/^fa-/, '');
    const style = STYLE_MAP[styleClass] || 'solid';
    const cacheKey = `${style}:${iconName}`;
    
    if (iconCache.has(cacheKey)) {
      changed = true;
      
      // Extract attributes for accessibility
      const attributes = {};
      const ariaLabelMatch = match.match(/aria-label="([^"]+)"/);
      const titleMatch = match.match(/title="([^"]+)"/);
      attributes.class = classes.join(' ');
      
      if (ariaLabelMatch) attributes['aria-label'] = ariaLabelMatch[1];
      else if (titleMatch) attributes['aria-label'] = titleMatch[1];
      
      const svg = iconCache.get(cacheKey);
      return processSvg(svg, iconName, attributes);
    }
    
    return match;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, html);
    return true;
  }
  return false;
}

function removeFaCssFromHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const before = html;
  
  // Remove FA CSS links and preloads
  html = html.replace(/<link[^>]*font-awesome[^>]*>/gi, '');
  html = html.replace(/<link[^>]*cdnjs\.cloudflare\.com[^>]*>/gi, '');
  html = html.replace(/<noscript><link[^>]*font-awesome[^>]*><\/noscript>/gi, '');
  
  if (html !== before) {
    fs.writeFileSync(filePath, html);
    return true;
  }
  return false;
}

(async () => {
  try {
    ensureDirSync(FA_CACHE_DIR);
    const files = findHtmlFiles(SITE_DIR);
    
    // Extract all FA icons from HTML
    const allIcons = new Set();
    for (const file of files) {
      const html = fs.readFileSync(file, 'utf8');
      const icons = extractFaIcons(html);
      icons.forEach(icon => allIcons.add(icon));
    }
    
    if (allIcons.size === 0) {
      console.log('No FA icons found to localize');
      return;
    }
    
    // Download and cache all icons
    const iconCache = new Map();
    let downloaded = 0;
    let cached = 0;
    
    for (const iconKey of allIcons) {
      const [style, iconName] = iconKey.split(':');
      try {
        const rawSvg = await downloadFaSvg(iconName, style);
        const processedSvg = processSvg(rawSvg, iconName);
        iconCache.set(iconKey, processedSvg);
        
        const cachePath = path.join(FA_CACHE_DIR, `${style}-${iconName}.svg`);
        if (fs.existsSync(cachePath)) cached++;
        else downloaded++;
        
      } catch (e) {
        console.error(`Failed to download ${iconName} (${style}):`, e.message);
      }
    }
    
    // Replace icons in HTML files
    let filesChanged = 0;
    let cssRemoved = 0;
    
    for (const file of files) {
      const iconReplaced = await replaceIconsInFile(file, iconCache);
      const faRemoved = removeFaCssFromHtml(file);
      
      if (iconReplaced) filesChanged++;
      if (faRemoved) cssRemoved++;
    }
    
    console.log(`FA localized: ${iconCache.size} icons (${downloaded} downloaded, ${cached} cached), ${filesChanged} files updated, FA CSS removed from ${cssRemoved} files`);
    
    // Add a small delay to prevent hanging
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (e) {
    console.error('FA localization failed:', e.message);
    process.exitCode = 1;
  }
})();
