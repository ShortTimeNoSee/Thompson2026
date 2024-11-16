# Thompson for California 2026

This repository contains the source code for Nicholas Thompson's 2026 California gubernatorial campaign website, live at [thompson2026.com](https://thompson2026.com).

## 🌟 Key Features

- Responsive design optimized for all devices
- Dynamic header with smooth scrolling and mobile-friendly navigation
- Issue-focused content presentation
- Integrated social media connections
- Contact form functionality
- SEO-optimized structure
- Accessibility considerations

## 🛠️ Technical Stack

- HTML5
- CSS3 with custom variables
- Vanilla JavaScript
- Cloudflare Pages for hosting
- No framework dependencies for maximum performance
- Mobile-first responsive design

## 📁 Repository Structure

```
.
├── .well-known/
│   └── discord           # Discord verification file
├── resources/
│   ├── favicon-{size}.png    # Favicon variants
│   ├── favicon.ico
│   └── Nicholas Thompson-{size}.webp  # Responsive candidate images
├── _headers              # Cloudflare headers configuration
├── _redirects.txt        # URL redirect rules
├── about.html           # About candidate page
├── contact.html         # Contact form and information
├── declaration_of_war.html   # Campaign declaration
├── header.html          # Shared header component
├── index.html           # Homepage
├── issues.html          # Platform and policy positions
├── robots.txt          # Search engine directives
├── script.js           # Core JavaScript functionality
├── sitemap.html        # Site navigation overview
├── sitemap.xml         # XML sitemap for search engines
├── static.json         # Static file configuration
├── styles.css          # Global styles
└── vision.html         # Campaign vision statement
```

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/ShortTimeNoSee/Thompson2026.git
   ```

2. For local development, you can use:
   - VS Code with Live Server extension (see configuration below)
   - Any other local server solution

### VS Code Live Server Configuration

To properly handle URL routing in VS Code's Live Server:

1. Open VS Code settings (`Ctrl` + `,`)
2. Click the "Open Settings (JSON)" icon in the top right
3. Add or update the following configuration:

```json
{
    "liveServer.settings.mount": [
        ["/about", "./about.html"],
        ["/contact", "./contact.html"],
        ["/issues", "./issues.html"],
        ["/ ", "./index.html"],
        ["/sitemap", "./sitemap.html"],
        ["/vision", "./vision.html"]
    ]
}
```

**Important Notes:**
- The space in `"/ "` is required to prevent CSS/JS breaking on other pages
- Pages listed after the `"/"` line will redirect to `"/"`
- Order matters for proper routing

### Declaration of War Feature Setup

The interactive Declaration of War feature requires some additional setup:

1. Create a Cloudflare Workers KV namespace:
   ```bash
   wrangler kv:namespace create "DECLARATION_KV"
   ```

2. Copy wrangler.toml.example to wrangler.toml and update with your KV namespace ID

3. Set up your environment variables in Cloudflare:
   - Go to Workers & Pages
   - Select your worker
   - Navigate to Settings > Variables
   - Add the required environment variables

### Security Note
Never commit sensitive information like API keys or KV namespace IDs to the repository. Use environment variables and the Cloudflare dashboard for configuration.

### Local Development
For local development, create a .env.local file with your development variables:
```bash
DECLARATION_KV_ID=your_kv_id
ALLOWED_ORIGINS=http://localhost:3000
```

## 💻 Development Guidelines

### CSS Structure
- Uses CSS variables for consistent theming
- Mobile-first approach with responsive breakpoints
- Modular structure with component-specific styles

### JavaScript Features
- Smooth scrolling implementation
- Dynamic header behavior
- Mobile menu functionality
- Form validation
- Social media integration

### Asset Management
- Responsive images with WebP format
- Multiple favicon sizes for different devices
- Organized resource directory structure

## 🔧 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📱 Social Media Integration

The website integrates with:
- Instagram (@nick.getspolitical)
- Twitter (@nickispolitical)
- YouTube (@nicholas4liberty)

## 🔒 Deployment

The site is deployed using Cloudflare Pages with:
- Custom domain from Namecheap
- Automatic HTTPS
- Global CDN distribution
- Built-in DDoS protection

## 📄 License

This project is licensed under the CC0 1.0 Universal License - see the LICENSE file for details.

## 🤝 Contact

For technical issues or contributions, please open an issue in this repository: [ShortTimeNoSee/Thompson2026](https://github.com/ShortTimeNoSee/Thompson2026/issues)

For campaign-related inquiries, use the contact form on [thompson2026.com](https://thompson2026.com/contact).

## 🌟 Acknowledgments

- Built with focus on performance and accessibility
- Designed to emphasize campaign message of liberty and limited government
- Optimized for California voter engagement

---

*This website is part of Nicholas Thompson's 2026 campaign for California Governor. Paid for by Nicholas Thompson 2026.*