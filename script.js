// Global constants and variables
const pageCache = new Map();
let header = document.getElementById("header");
let h1, h2;
let sticky = header ? header.offsetTop : 0;

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Load header and initialize functionalities
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
            setActiveLink();
            setupHamburgerToggle();
            setupPreloadListeners();

            // Initialize issue cards after header is loaded
            initializeIssueCards();
        })
        .catch(error => console.error('Error loading header:', error));

    // Setup sticky footer
    setupStickyFooter();

    // Initialize DeclarationComponent if element exists
    if (document.getElementById('declaration-interactive')) {
        new DeclarationComponent('declaration-interactive');
    }

    // Initialize Particle Shatter
    if (document.getElementById('particleCanvas')) {
        initParticleShatter();
    }

    // Make body visible after content is loaded
    document.body.style.display = 'block';
});

// Throttle scroll events for sticky header
window.onscroll = throttle(stickyHeader, 100);

/**
 * Sets the active navigation link based on the current URL.
 */
function setActiveLink() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === path || (path === '/' && href === '/index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Implements a sticky header with a shrink effect on scroll.
 */
function stickyHeader() {
    if (!header) {
        header = document.getElementById("header");
        if (!header) return;
        sticky = header.offsetTop;
    }

    if (window.scrollY > sticky) {
        header.classList.add("sticky");
        h1 = h1 || header.querySelector("h1");
        h2 = h2 || header.querySelector("h2");
        const scrollProgress = Math.min(window.scrollY / sticky, 1);
        if (h1) h1.style.fontSize = `${2 - 0.5 * scrollProgress}em`;
        if (h2) h2.style.fontSize = `${1.2 - 0.2 * scrollProgress}em`;
        header.style.padding = `${10 - 5 * scrollProgress}px 0`;
    } else {
        header.classList.remove("sticky");
        if (h1) h1.style.fontSize = "2em";
        if (h2) h2.style.fontSize = "1.2em";
        header.style.padding = "10px 0";
    }
}

/**
 * Limits the rate at which a function can fire.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time limit in milliseconds.
 */
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function (...args) {
        const context = this;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Sets up the mobile menu (hamburger toggle).
 */
function setupHamburgerToggle() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.querySelector('nav ul');
    const body = document.body;

    if (hamburger && nav) {
        // Create hamburger icon
        hamburger.innerHTML = '<div></div>';

        // Toggle menu on hamburger click
        hamburger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });

        // Disable default action on Platform button in mobile
        const dropBtn = document.querySelector('.dropbtn');
        if (dropBtn) {
            dropBtn.addEventListener('click', function (e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                }
            });
        }

        // Close menu when clicking a link (except Platform)
        const navLinks = nav.querySelectorAll('a:not(.dropbtn)');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (
                nav.classList.contains('active') &&
                !nav.contains(e.target) &&
                !hamburger.contains(e.target)
            ) {
                closeMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                closeMenu();
            }
        });

        // Close menu on window resize
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        });

        function toggleMenu() {
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
            body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        }

        function closeMenu() {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
            body.style.overflow = '';
        }
    }
}

/**
 * Sets up the sticky footer with visibility toggle based on page footer visibility.
 */
function setupStickyFooter() {
    const footer = document.createElement("div");
    footer.className = "sticky-footer";
    footer.innerHTML = `<p><a href="https://registertovote.ca.gov/" target="_blank" style="color: #FED000;">Click here</a> to register to vote in California; support Nicholas in 2026!</p>`;
    document.body.appendChild(footer);

    const stickyFooter = document.querySelector('.sticky-footer');
    const pageFooter = document.querySelector('footer');

    if (pageFooter && stickyFooter) {
        const footerObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        stickyFooter.classList.add('hidden');
                    } else {
                        stickyFooter.classList.remove('hidden');
                    }
                });
            },
            { threshold: 0.1 }
        );

        footerObserver.observe(pageFooter);
    }
}

/**
 * Preloads a page and caches its content.
 * @param {string} url - The URL of the page to preload.
 */
async function preloadPage(url) {
    if (pageCache.has(url)) return;

    try {
        const response = await fetch(url);
        const text = await response.text();
        pageCache.set(url, text);
    } catch (error) {
        console.error(`Failed to preload ${url}:`, error);
    }
}

/**
 * Sets up listeners to preload pages on navigation link hover.
 */
function setupPreloadListeners() {
    const links = document.querySelectorAll('nav a:not([target="_blank"])');

    links.forEach(link => {
        let timer;

        link.addEventListener('mouseenter', () => {
            // Start a timer when hovering
            timer = setTimeout(() => {
                const url = link.href;
                if (url && !url.startsWith('javascript:')) {
                    preloadPage(url);
                }
            }, 100); // Small delay to prevent unnecessary preloads
        });

        link.addEventListener('mouseleave', () => {
            // Cancel preload if mouse leaves quickly
            clearTimeout(timer);
        });
    });
}

/**
 * Initializes issue cards with flip functionality and action prompts.
 */
function initializeIssueCards() {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const actionText = isTouchDevice ? "Tap to Learn More" : "Click to Learn More";
    const cards = document.querySelectorAll(".issue-card");

    cards.forEach((card) => {
        // Add click event to toggle flip
        card.addEventListener("click", () => {
            card.classList.toggle("flipped");
        });

        // Create and append action prompt only to front face
        const frontFace = card.querySelector(".front");
        if (frontFace && !frontFace.querySelector(".action-prompt")) {
            const actionPrompt = document.createElement("div");
            actionPrompt.className = "action-prompt";
            actionPrompt.textContent = actionText;
            frontFace.appendChild(actionPrompt);
        }
    });
}

/**
 * =====================
 * Particle Shatter Script
 * =====================
 */

function initParticleShatter() {
    const chainImageSrc = "resources/chain_shape.png"; // Ensure this path is correct
    const californiaImageSrc = "resources/california_outline.png"; // Ensure this path is correct

    const canvas = document.getElementById("particleCanvas");
    const ctx = canvas.getContext("2d");

    // Global variables within particle shatter
    let imagesLoaded = 0;

    // Adjust canvas size
    function resizeCanvas() {
        // Set internal canvas size larger to allow particles to fly out
        // Example: Internal size is much larger than display size
        canvas.width = window.innerWidth > 768 ? 1500 : window.innerWidth * 2;
        canvas.height = window.innerWidth > 768 ? 1500 : 600;
        if (imagesLoaded === 2) {
            drawCalifornia();
            // No need to call drawParticles() as particles are handled in the animate loop
        }
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const particles = [];
    const particleCount = 5000;
    const particleRadius = 5;

    // Shatter variables
    let shattered = false;
    let shatterX = 0;
    let shatterY = 0;
    const clickPadding = 10;

    // Crack variables
    let crackPath = [];
    const crackSegments = 20; // Number of segments in the crack
    const crackJitter = 15; // Maximum vertical deviation for jaggedness
    const crackThickness = 10; // Thickness around the crack line to determine affected particles

    // Load images
    const chainImage = new Image();
    const californiaImage = new Image();
    chainImage.src = chainImageSrc;
    californiaImage.src = californiaImageSrc;

    // Ensure both images are loaded before initializing
    chainImage.onload = californiaImage.onload = () => {
        imagesLoaded++;
        console.log(`Image loaded: ${imagesLoaded}/2`);
        if (imagesLoaded === 2) init();
    };

    // Handle image loading errors
    chainImage.onerror = californiaImage.onerror = () => {
        console.error('Error loading one or more images for Particle Shatter.');
    };

    /**
     * Initializes the canvas by drawing California outline and generating particles.
     */
    function init() {
        drawCalifornia();

        // Create an offscreen canvas to process the chain image
        const offCanvas = document.createElement("canvas");
        const offCtx = offCanvas.getContext("2d");
        offCanvas.width = chainImage.width;
        offCanvas.height = chainImage.height;
        offCtx.drawImage(chainImage, 0, 0);

        // Get image data (alpha channel)
        const imageData = offCtx.getImageData(0, 0, chainImage.width, chainImage.height).data;
        generateParticles(imageData, chainImage.width, chainImage.height);
        requestAnimationFrame(animate);
    }

    /**
     * Draws the California outline scaled to the canvas.
     */
    function drawCalifornia() {
        const imgWidth = californiaImage.width;
        const imgHeight = californiaImage.height;
        const scale = Math.min(canvas.width / imgWidth, canvas.height / imgHeight);
        const offsetX = (canvas.width - imgWidth * scale) / 2; // Center horizontally
        const offsetY = (canvas.height - imgHeight * scale) / 2; // Center vertically
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            californiaImage,
            offsetX,
            offsetY,
            imgWidth * scale,
            imgHeight * scale
        );
    }

    /**
     * Generates particles based on the chain image's alpha data.
     * @param {Uint8ClampedArray} imageData - The alpha channel data of the chain image.
     * @param {number} imgWidth - Width of the chain image.
     * @param {number} imgHeight - Height of the chain image.
     */
    function generateParticles(imageData, imgWidth, imgHeight) {
        const scale = Math.min(canvas.width / imgWidth, canvas.height / imgHeight);
        const offsetX = (canvas.width - imgWidth * scale) / 2; // Center horizontally
        const offsetY = (canvas.height - imgHeight * scale) / 2; // Center vertically

        console.log('Generating particles...');
        for (let i = 0; i < particleCount; i++) {
            let found = false;
            let attempts = 0;
            const maxAttempts = 1000; // Prevent infinite loops
            while (!found && attempts < maxAttempts) {
                const x = Math.floor(Math.random() * imgWidth);
                const y = Math.floor(Math.random() * imgHeight);
                const pixelIndex = (y * imgWidth + x) * 4;
                const alpha = imageData[pixelIndex + 3];
                if (alpha > 0) {
                    found = true;
                    const transparency = alpha / 255;
                    const color = interpolateColor("#FED000", "#776600", transparency);
                    const scaledX = x * scale + offsetX;
                    const scaledY = y * scale + offsetY;
                    particles.push({
                        x: scaledX,
                        y: scaledY,
                        color,
                        radius: particleRadius, // Radius set to 4
                        shattered: false,
                        vx: 0,
                        vy: 0
                    });
                }
                attempts++;
            }
            if (attempts === maxAttempts) {
                console.warn(`Max attempts reached for particle ${i}.`);
            }
        }
        console.log(`Generated ${particles.length} particles.`);
    }

    /**
     * Interpolates between two hex colors based on a ratio.
     * @param {string} color1 - The starting color in hex format (e.g., "#FED000").
     * @param {string} color2 - The ending color in hex format (e.g., "#776600").
     * @param {number} ratio - The ratio between 0 and 1.
     * @returns {string} - The interpolated color in hex format.
     */
    function interpolateColor(color1, color2, ratio) {
        const hexToRgb = (hex) => hex.replace(/^#/, "").match(/.{2}/g).map(x => parseInt(x, 16));
        const rgbToHex = ([r, g, b]) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16).slice(1).toUpperCase();
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * ratio));
        return rgbToHex(result);
    }

    /**
     * Animates the particles and handles the shatter effect.
     */
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCalifornia();

        if (!shattered) {
            // Draw all particles normally
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            // Shatter effect
            particles.forEach(p => {
                if (!p.shattered) {
                    p.shattered = true;
                    // Determine if the particle is near the crack line
                    const distance = pointToCrackDistance(p.x, p.y);
                    if (distance < crackThickness) {
                        // Near the crack: violent explosion outward perpendicular to the crack
                        const angle = getCrackNormalAngle(p.x, p.y);
                        const speed = 8 + Math.random() * 6; // Increased speed for more "umph"
                        p.vx = Math.cos(angle) * speed;
                        p.vy = Math.sin(angle) * speed;
                    } else {
                        // Away from the crack: normal shatter outward from the shatter point
                        const angle = Math.atan2(p.y - shatterY, p.x - shatterX);
                        const speed = 3 + Math.random() * 3; // Normal speed
                        p.vx = Math.cos(angle) * speed;
                        p.vy = Math.sin(angle) * speed;
                    }
                }
                // Update particle position
                p.x += p.vx;
                p.y += p.vy;
                // Fade out effect
                ctx.fillStyle = fadeColor(p.color, p.shattered);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        requestAnimationFrame(animate);
    }

    /**
     * Calculates the minimum distance from a point to the crack path.
     * @param {number} px - X-coordinate of the point.
     * @param {number} py - Y-coordinate of the point.
     * @returns {number} - The minimum distance.
     */
    function pointToCrackDistance(px, py) {
        let minDist = Infinity;
        for (let i = 0; i < crackPath.length - 1; i++) {
            const seg = crackPath[i];
            const dist = distanceToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
            if (dist < minDist) {
                minDist = dist;
            }
        }
        return minDist;
    }

    /**
     * Calculates the distance from a point to a line segment.
     * @param {number} px - X-coordinate of the point.
     * @param {number} py - Y-coordinate of the point.
     * @param {number} x1 - X-coordinate of the segment start.
     * @param {number} y1 - Y-coordinate of the segment start.
     * @param {number} x2 - X-coordinate of the segment end.
     * @param {number} y2 - Y-coordinate of the segment end.
     * @returns {number} - The distance.
     */
    function distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates the normal angle of the crack at the particle's position.
     * @param {number} px - X-coordinate of the particle.
     * @param {number} py - Y-coordinate of the particle.
     * @returns {number} - The normal angle in radians.
     */
    function getCrackNormalAngle(px, py) {
        // Find the segment closest to the particle
        let closestSeg = null;
        let minDist = Infinity;
        for (let i = 0; i < crackPath.length - 1; i++) {
            const seg = crackPath[i];
            const dist = distanceToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
            if (dist < minDist) {
                minDist = dist;
                closestSeg = seg;
            }
        }
        if (closestSeg) {
            // Calculate the angle perpendicular to the crack segment
            const dx = closestSeg.x2 - closestSeg.x1;
            const dy = closestSeg.y2 - closestSeg.y1;
            const angle = Math.atan2(dy, dx);
            // Perpendicular angle
            return angle + Math.PI / 2;
        }
        return 0;
    }

    /**
     * Fades out the particle color based on its shatter state.
     * @param {string} color - The original color in hex format.
     * @param {boolean} shattered - Whether the particle has shattered.
     * @returns {string} - The color in RGBA format with adjusted opacity.
     */
    function fadeColor(color, shattered) {
        if (!shattered) return color;
        // Convert hex to RGBA with decreasing opacity
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        // Assuming particles fade out after shattering
        // You can enhance this by tracking life or distance
        return `rgba(${r}, ${g}, ${b}, 0.7)`; // Semi-transparent
    }

    /**
     * Handles click and touch events to trigger the shatter effect.
     * @param {number} mx - The X-coordinate of the click/touch relative to the canvas.
     * @param {number} my - The Y-coordinate of the click/touch relative to the canvas.
     */
    function handleShatter(mx, my) {
        if (shattered) return; // Prevent multiple shatters
        console.log(`Shatter triggered at (${mx}, ${my})`);

        // Calculate scaling factors
        const scaleX = canvas.width / canvas.clientWidth;
        const scaleY = canvas.height / canvas.clientHeight;

        // Map click coordinates to internal canvas coordinates
        const internalX = mx * scaleX;
        const internalY = my * scaleY;

        console.log(`Internal Shatter Point: (${internalX}, ${internalY})`);

        // Find if a particle is near the shatter point
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = internalX - p.x;
            const dy = internalY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + clickPadding) {
                console.log(`Particle ${i} is near the shatter point. Shattering...`);
                shattered = true;
                shatterX = internalX;
                shatterY = internalY;
                createJaggedCrack(shatterX, shatterY);
                break;
            }
        }

        if (!shattered) {
            console.log('No particles near the shatter point. Shatter not triggered.');
        }
    }

    /**
     * Creates a jagged crack across the canvas at the shatter point.
     * @param {number} cx - The X-coordinate of the shatter point.
     * @param {number} cy - The Y-coordinate of the shatter point.
     */
    function createJaggedCrack(cx, cy) {
        console.log('Creating jagged crack...');
        crackPath = [];
        const startX = 0;
        const endX = canvas.width;
        const segmentWidth = endX / crackSegments;
        let currentX = startX;
        let currentY = cy;

        for (let i = 0; i <= crackSegments; i++) {
            let nextX = segmentWidth * i;
            // Add random vertical jitter for jaggedness
            let jitter = 0;
            if (i !== 0 && i !== crackSegments) { // Avoid jitter at the ends
                jitter = (Math.random() - 0.5) * crackJitter;
            }
            let nextY = cy + jitter;
            crackPath.push({
                x1: currentX,
                y1: currentY,
                x2: nextX,
                y2: nextY
            });
            currentX = nextX;
            currentY = nextY;
        }
        console.log('Jagged crack created:', crackPath);
    }

    // Handle click and touch events with correct coordinates
    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        console.log(`Canvas clicked at (${mx}, ${my})`);
        handleShatter(mx, my);
    });

    canvas.addEventListener("touchstart", (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const mx = touch.clientX - rect.left;
        const my = touch.clientY - rect.top;
        console.log(`Canvas touched at (${mx}, ${my})`);
        handleShatter(mx, my);
    });

    /**
     * Interpolates between two hex colors based on a ratio.
     * @param {string} color1 - The starting color in hex format (e.g., "#FED000").
     * @param {string} color2 - The ending color in hex format (e.g., "#776600").
     * @param {number} ratio - The ratio between 0 and 1.
     * @returns {string} - The interpolated color in hex format.
     */
    function interpolateColor(color1, color2, ratio) {
        const hexToRgb = (hex) => hex.replace(/^#/, "").match(/.{2}/g).map(x => parseInt(x, 16));
        const rgbToHex = ([r, g, b]) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16).slice(1).toUpperCase();
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * ratio));
        return rgbToHex(result);
    }
}