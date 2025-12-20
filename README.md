# Thompson2026 Technical Documentation

Static campaign website built with Eleventy, deployed on Cloudflare Pages with Cloudflare Workers for edge API handling.

## Architecture Overview

### Static Site Generation
- **Generator**: Eleventy (11ty) v3.1.2
- **Template Engine**: Liquid (HTML), Nunjucks (feeds), Markdown (blog posts)
- **Source Directory**: `src/`
- **Output Directory**: `_site/`
- **Data Layer**: JSON files in `src/_data/` for site metadata and California county registrar information

### CSS Architecture
Modular CSS with a granular per-page optimization pipeline:

```
styles/
├── base/         (variables, reset, typography, animations)
├── components/   (header, footer, buttons, cards, forms, social)
├── layout/       (grid, sections, responsive)
├── pages/        (page-specific styles)
└── utils/        (helpers, dark-mode)
```

**Build Process**:
1. PostCSS imports all modules via `styles/main.css`
2. cssnano minifies and removes comments
3. Global CSS written to `dist/styles.min.css`
4. PurgeCSS generates per-page CSS files in `_site/dist/page-css/`
5. Each HTML file's stylesheet link is rewritten to its own purged CSS

This eliminates unused CSS on every page, reducing payload sizes significantly.

### JavaScript
Vanilla JavaScript with no framework dependencies:
- `src/js/script.js` - global utilities, dark mode, navigation
- `src/js/ballot-petition.js` - petition signature collection
- `src/js/declaration-interactive.js` - declaration signing interface
- `src/js/shop.js` - e-commerce frontend (cart, checkout handoff)

### Edge Runtime (Cloudflare Workers)
`worker.js` handles server-side logic:

**API Endpoints**:
- `/api/sign-declaration` - Signature collection with rate limiting (24h/IP), sanitization, metadata capture
- `/api/declaration-stats` - Public stats retrieval (signature count, counties, list)
- `/api/admin/edit-signature` - Admin signature editing (requires Bearer auth)
- `/api/admin/remove-signature` - Admin signature removal (requires Bearer auth)
- `/api/cart-handoff` - Cart data handoff to WooCommerce with HMAC signature
- `/api/shop/*` - Proxy to WooCommerce REST API with Basic auth
- `/api/shop/printful/order` - Proxy to Printful API with Bearer auth

**Storage**: Cloudflare KV for:
- Signature data (`signatures_list`, `total_signatures`)
- County tracking (`counties_list`, `counties_represented`)
- Rate limiting (`rate_limit:{ip}`)
- IP tracking (`ip_county:{ip}`, `ip_sign_count:{ip}`)

**Security**:
- CORS with strict origin whitelist
- XSS prevention via HTML escaping on all user input
- Rate limiting (1 signature per IP per 24h)
- County consistency enforcement (IP can't sign for multiple counties)
- Admin endpoints require Bearer token authentication
- Metadata logging (IP, user-agent, geolocation, device type) for fraud detection

### Build Pipeline

Full build process (`npm run build`):

1. **CSS Compilation**: PostCSS processes `styles/main.css` → `dist/styles.min.css`
2. **Site Generation**: Eleventy builds HTML from `src/` → `_site/`
3. **Font Awesome Localization**: Inlines FA icons used in HTML
4. **Global PurgeCSS**: Removes unused CSS from base stylesheet
5. **EXIF Stripping**: Strips metadata from images, optimizes with Sharp
6. **Image Localization**: Downloads external images to local resources
7. **Script Localization**: Inlines external scripts
8. **Asset Fingerprinting**: Generates content-hash filenames for cache busting
9. **Per-Page CSS**: Generates and links individual purged CSS per HTML file
10. **Inline Small CSS**: Inlines small CSS files directly into HTML
11. **Blog Thumbnail Fix**: Ensures blog post thumbnails exist
12. **Precompression**: Generates Brotli (.br) and Gzip (.gz) for all text assets

### Image Optimization
- **Library**: Sharp
- **Formats**: JPEG (mozjpeg, q82), PNG (level 9), WebP (q75), AVIF (q50)
- **Process**: EXIF stripping, chroma subsampling, palette optimization
- **WebP Conversion**: Automatic WebP generation for all raster images

### Performance Optimizations

**Precompression**:
- Brotli (quality 11) and Gzip (level 9) for HTML, CSS, JS, JSON, XML, SVG
- Served via content negotiation on Cloudflare

**Cache Strategy** (via `_headers`):
- HTML: `no-cache, must-revalidate` (always fresh)
- Feeds: `no-cache, must-revalidate`
- Assets (`/dist/*`, `/js/*`, `/resources/*`): `max-age=31536000, immutable` (1 year)
- Sitemap: `max-age=3600` (1 hour)

**Asset Fingerprinting**:
- SHA-1 hash (8 chars) appended to CSS/JS filenames
- Automatic HTML reference updates
- Forces cache invalidation on content changes

**Per-Page CSS**:
- PurgeCSS scans each HTML + all JS files
- Generates minimal CSS containing only used selectors
- Safelist for dynamic classes (Font Awesome, active states, dropdowns)

### Security Headers
Configured in `_headers`:
- `Content-Security-Policy`: Strict CSP with explicit allowlists
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`: HSTS with preload
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: cross-origin`
- `Permissions-Policy`: Blocks camera, microphone, geolocation, browsing-topics

### Blog System
- Markdown source files in `src/blog/*.md`
- Eleventy collections: `posts`, `postsSorted`
- Custom filters: `readableDate`, `htmlDateString`, `rfc822Date`, `isoDateString`, `striptags`, `urlencode`
- RSS feed (`feed.xml`) and JSON Feed (`feed.json`)
- Post layout template: `src/_includes/post.html`

### Data Sources
- `src/_data/site.json` - Site metadata (title, author, feed paths)
- `src/_data/registrars.json` - California county registrar information (642 lines)

### Dependencies

**Core**:
- `@11ty/eleventy` ^3.1.2 - Static site generator
- `postcss` ^8.4.31 - CSS processing
- `cssnano` ^7.1.0 - CSS minification
- `purgecss` ^7.0.2 - Unused CSS removal
- `sharp` ^0.34.5 - Image processing

**Utilities**:
- `luxon` ^3.7.1 - Date/time handling
- `http-server` ^14.1.1 - Local development server
- `rimraf` ^6.0.1 - Cross-platform file removal

### Development

**Commands**:
```bash
npm run dev           # Build CSS + Eleventy dev server (with watch)
npm run serve         # Same as dev
npm run build         # Full production build with all optimizations
npm run build:clean   # Clean _site/ then full build
npm run build:css     # CSS compilation only
npm run build:eleventy # Eleventy build only
npm run serve:built   # Build then serve on port 8082
npm run watch         # Watch CSS changes
npm run clean         # Remove _site/
```

**Dev Server**: Eleventy serves on `http://localhost:8080` with live reload

### Deployment

**Platform**: Cloudflare Pages
- Build command: `npm run build`
- Publish directory: `_site`
- Environment variables required:
  - `ADMIN_KEY` - Admin API authentication
  - `WC_USER` / `WC_PASS` - WooCommerce API credentials
  - `PRINTFUL_KEY` - Printful API token
  - `HANDOFF_SECRET` - Cart handoff HMAC secret

**Worker Bindings**:
- `DECLARATION_KV` - KV namespace for signature data

### File Structure

```
├── src/                  # Eleventy source
│   ├── _data/           # JSON data files
│   ├── _includes/       # Layout templates
│   ├── blog/            # Markdown blog posts
│   ├── js/              # Client-side JavaScript
│   ├── shop/            # Shop product templates
│   └── *.html           # Page templates
├── styles/              # Modular CSS source
├── scripts/             # Build pipeline scripts
├── resources/           # Images, PDFs, static assets
├── dist/                # Compiled CSS output
├── _site/               # Built site output (gitignored)
├── worker.js            # Cloudflare Worker edge functions
├── .eleventy.js         # Eleventy configuration
├── postcss.config.js    # PostCSS configuration
├── purgecss.config.cjs  # PurgeCSS safelist
├── _headers             # HTTP headers for Cloudflare
└── package.json         # Dependencies and build scripts
```

### Notes

- Shop functionality integrates with external WooCommerce instance via API proxy
- Worker acts as middleware for authentication and CORS
- All user-generated content is sanitized server-side to prevent XSS
- IP-based rate limiting prevents spam/abuse on signature collection
- Geolocation and device fingerprinting via Cloudflare's request object
- Blog post dates handled in UTC via Luxon
- Responsive design without CSS frameworks (custom grid/flexbox)
- Dark mode toggle persists via localStorage
- No external CDN dependencies (all assets localized during build)

### License

Licensed under the Liberty-ShareAlike Public License (LSA-1.0).
You may use, share, and adapt this material for any purpose.
If you distribute adaptations, you must license them under LSA-1.0 and
include the full license text or a stable link to it.
No attribution is required. No additional restrictions or DRM may be applied.
