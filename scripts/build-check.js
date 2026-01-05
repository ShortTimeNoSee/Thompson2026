#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}🔍 Build Quality Check${RESET}\n`);

let issuesFound = 0;
let warningsFound = 0;

function checkFileSize(filePath, maxSizeKB, name) {
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeKB = stats.size / 1024;
        if (sizeKB > maxSizeKB) {
            console.log(`${RED}✗${RESET} ${name} is ${sizeKB.toFixed(2)}KB (exceeds ${maxSizeKB}KB)`);
            issuesFound++;
            return false;
        } else {
            console.log(`${GREEN}✓${RESET} ${name}: ${sizeKB.toFixed(2)}KB`);
            return true;
        }
    } else {
        console.log(`${YELLOW}⚠${RESET} ${name} not found at ${filePath}`);
        warningsFound++;
        return false;
    }
}

function checkDirectory(dirPath, extensions, maxSizeKB, label) {
    if (!fs.existsSync(dirPath)) {
        console.log(`${YELLOW}⚠${RESET} ${label} directory not found`);
        warningsFound++;
        return;
    }

    const files = fs.readdirSync(dirPath);
    const filtered = files.filter(f => extensions.some(ext => f.endsWith(ext)));
    
    if (filtered.length === 0) {
        console.log(`${YELLOW}⚠${RESET} No ${label} files found`);
        warningsFound++;
        return;
    }

    let totalSize = 0;
    let largeFiles = [];

    filtered.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = stats.size / 1024;
        totalSize += sizeKB;

        if (sizeKB > maxSizeKB) {
            largeFiles.push({ file, sizeKB });
        }
    });

    console.log(`${GREEN}✓${RESET} ${label}: ${filtered.length} files, total ${totalSize.toFixed(2)}KB`);

    if (largeFiles.length > 0) {
        largeFiles.forEach(({ file, sizeKB }) => {
            console.log(`  ${YELLOW}⚠${RESET} Large file: ${file} (${sizeKB.toFixed(2)}KB)`);
            warningsFound++;
        });
    }
}

function checkUnusedClasses() {
    const cssPath = './dist/styles.min.css';
    const htmlDir = './_site';

    if (!fs.existsSync(cssPath)) {
        console.log(`${YELLOW}⚠${RESET} CSS file not found for unused class check`);
        warningsFound++;
        return;
    }

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const classMatches = cssContent.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g);
    
    if (!classMatches) {
        console.log(`${GREEN}✓${RESET} CSS classes check: No standalone classes found`);
        return;
    }

    const cssClasses = [...new Set(classMatches.map(c => c.substring(1)))];
    
    // Get all HTML files
    let allHtmlContent = '';
    function readHtmlFiles(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory() && !file.startsWith('.')) {
                readHtmlFiles(filePath);
            } else if (file.endsWith('.html')) {
                allHtmlContent += fs.readFileSync(filePath, 'utf8');
            }
        });
    }

    if (fs.existsSync(htmlDir)) {
        readHtmlFiles(htmlDir);
    }

    // Check for obviously unused classes (simple heuristic)
    const suspiciousClasses = cssClasses.filter(cls => {
        // Skip common utility/state classes
        if (/^(active|hover|focus|disabled|open|closed|visible|hidden)$/.test(cls)) return false;
        if (/^(js-|fa-|fab-|fas-|far-|fal-)/.test(cls)) return false;
        if (/^(sr-only|visually-hidden)$/.test(cls)) return false;
        
        // Check if class appears in HTML
        const regex = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'g');
        return !regex.test(allHtmlContent);
    });

    if (suspiciousClasses.length > 0 && suspiciousClasses.length < 50) {
        console.log(`${YELLOW}⚠${RESET} Potentially unused CSS classes (${suspiciousClasses.length}):`);
        suspiciousClasses.slice(0, 10).forEach(cls => {
            console.log(`    - .${cls}`);
        });
        if (suspiciousClasses.length > 10) {
            console.log(`    ... and ${suspiciousClasses.length - 10} more`);
        }
        warningsFound++;
    } else {
        console.log(`${GREEN}✓${RESET} CSS usage check passed`);
    }
}

function checkImages() {
    const imgDir = './_site/resources';
    
    if (!fs.existsSync(imgDir)) {
        console.log(`${YELLOW}⚠${RESET} Images directory not found`);
        warningsFound++;
        return;
    }

    function checkImagesRecursive(dir) {
        const files = fs.readdirSync(dir);
        let largeImages = [];
        let unoptimizedImages = [];

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                const results = checkImagesRecursive(filePath);
                largeImages = largeImages.concat(results.largeImages);
                unoptimizedImages = unoptimizedImages.concat(results.unoptimizedImages);
            } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
                const sizeKB = stat.size / 1024;
                
                if (sizeKB > 500) {
                    largeImages.push({ file: path.relative(imgDir, filePath), sizeKB });
                }
                
                if (/\.(jpg|jpeg|png)$/i.test(file) && !file.includes('.min.')) {
                    const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                    if (!fs.existsSync(webpPath)) {
                        unoptimizedImages.push(path.relative(imgDir, filePath));
                    }
                }
            }
        });

        return { largeImages, unoptimizedImages };
    }

    const results = checkImagesRecursive(imgDir);

    if (results.largeImages.length > 0) {
        console.log(`${YELLOW}⚠${RESET} Large images found (>500KB):`);
        results.largeImages.forEach(({ file, sizeKB }) => {
            console.log(`    - ${file}: ${sizeKB.toFixed(2)}KB`);
        });
        warningsFound++;
    } else {
        console.log(`${GREEN}✓${RESET} Image sizes check passed`);
    }

    if (results.unoptimizedImages.length > 0 && results.unoptimizedImages.length < 10) {
        console.log(`${YELLOW}⚠${RESET} Images without WebP versions (${results.unoptimizedImages.length}):`);
        results.unoptimizedImages.slice(0, 5).forEach(file => {
            console.log(`    - ${file}`);
        });
        if (results.unoptimizedImages.length > 5) {
            console.log(`    ... and ${results.unoptimizedImages.length - 5} more`);
        }
        warningsFound++;
    }
}

// Run checks
console.log(`${BOLD}📦 File Size Checks${RESET}`);
checkFileSize('./dist/styles.min.css', 150, 'Main CSS bundle');
checkFileSize('./dist/script.min.js', 50, 'Main JS bundle');

console.log(`\n${BOLD}📁 Asset Checks${RESET}`);
checkDirectory('./_site/js', ['.js'], 100, 'JavaScript files');
checkDirectory('./_site/resources', ['.webp', '.jpg', '.png'], 200, 'Image files');

console.log(`\n${BOLD}🎨 CSS Quality Checks${RESET}`);
checkUnusedClasses();

console.log(`\n${BOLD}🖼️  Image Optimization Checks${RESET}`);
checkImages();

// Summary
console.log(`\n${BOLD}Summary${RESET}`);
if (issuesFound === 0 && warningsFound === 0) {
    console.log(`${GREEN}${BOLD}✓ All checks passed!${RESET}`);
    process.exit(0);
} else {
    if (issuesFound > 0) {
        console.log(`${RED}✗ ${issuesFound} issue(s) found${RESET}`);
    }
    if (warningsFound > 0) {
        console.log(`${YELLOW}⚠ ${warningsFound} warning(s) found${RESET}`);
    }
    
    if (issuesFound > 0) {
        console.log(`\n${YELLOW}Note: Warnings are informational and don't fail the build.${RESET}`);
        process.exit(1);
    } else {
        process.exit(0);
    }
}

