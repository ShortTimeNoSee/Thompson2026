const pageCache = new Map();
let header = document.getElementById("header");
let h1, h2;
let sticky = header ? header.offsetTop : 0;

document.addEventListener("DOMContentLoaded", () => {
    setupStickyFooter();

    const canvas = document.getElementById('particleCanvas');
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    if (canvas && isHomePage) {
        console.log('Initializing particle shatter on homepage');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!canvas.animationStarted) {
                        canvas.animationStarted = true;
                        initParticleShatter();
                    }
                } else {
                    if (canvas.animationId) {
                        cancelAnimationFrame(canvas.animationId);
                        canvas.animationId = null;
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        observer.observe(canvas);
    }
});

window.onscroll = throttle(stickyHeader, 100);

function setActiveLink() {
    const path = window.location.pathname;
    const bodyId = document.body.id;
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const dataPage = link.getAttribute('data-page');
        
        let isActive = false;
        
        if (path === '/' && (href === '/' || href === '/index.html' || dataPage === 'home')) {
            isActive = true;
        } else if (path !== '/' && href === path) {
            isActive = true;
        } else if (bodyId && dataPage && bodyId.includes(dataPage)) {
            isActive = true;
        }
        
        if (isActive) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

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

function setupHamburgerToggle() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.querySelector('nav ul');
    const body = document.body;

    if (hamburger && nav) {
        hamburger.innerHTML = '<div></div>';

        hamburger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });

        const dropBtn = document.querySelector('.dropbtn');
        if (dropBtn) {
            dropBtn.addEventListener('click', function (e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                }
            });
        }

        const navLinks = nav.querySelectorAll('a:not(.dropbtn)');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (
                nav.classList.contains('active') &&
                !nav.contains(e.target) &&
                !hamburger.contains(e.target)
            ) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                closeMenu();
            }
        });

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

function setupPreloadListeners() {
    const links = document.querySelectorAll('nav a:not([target="_blank"])');

    links.forEach(link => {
        let timer;

        link.addEventListener('mouseenter', () => {
            timer = setTimeout(() => {
                const url = link.href;
                if (url && !url.startsWith('javascript:')) {
                    preloadPage(url);
                }
            }, 100);
        });

        link.addEventListener('mouseleave', () => {
            clearTimeout(timer);
        });
    });
}

function initializeIssueCards() {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const actionText = isTouchDevice ? "Tap to Learn More" : "Click to Learn More";
    const cards = document.querySelectorAll(".issue-card");

    cards.forEach((card) => {
        card.addEventListener("click", () => {
            card.classList.toggle("flipped");
        });

        const frontFace = card.querySelector(".front");
        if (frontFace && !frontFace.querySelector(".action-prompt")) {
            const actionPrompt = document.createElement("div");
            actionPrompt.className = "action-prompt";
            actionPrompt.textContent = actionText;
            frontFace.appendChild(actionPrompt);
        }
    });
}

function initParticleShatter() {
    const CHAIN_IMAGE_PATH = '/resources/chain_shape.png';
    const CALIFORNIA_IMAGE_PATH = '/resources/california_outline.png';

    const canvas = document.getElementById("particleCanvas");
    const ctx = canvas.getContext("2d");

    let imagesLoaded = 0;

    let displayWidth, displayHeight;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        displayWidth = rect.width;
        displayHeight = rect.height;
        
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = displayHeight * devicePixelRatio;
        
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        if (imagesLoaded === 2) {
            drawCalifornia();
        }
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const particles = [];
    const particleCount = 2000;
    const baseParticleRadius = 4;
    
    function getScaledParticleRadius() {
        const scaleFactor = Math.min(displayWidth, displayHeight) / 350;
        return Math.max(1, baseParticleRadius * scaleFactor * 0.6);
    }

    let shattered = false;
    let shatterX = 0;
    let shatterY = 0;
    const clickPadding = 10;

    let crackPath = [];
    const crackSegments = 20;
    const crackJitter = 15;
    const crackThickness = 10;

    const chainImage = new Image();
    const californiaImage = new Image();
    chainImage.src = CHAIN_IMAGE_PATH;
    californiaImage.src = CALIFORNIA_IMAGE_PATH;

    chainImage.onload = californiaImage.onload = () => {
        imagesLoaded++;
        console.log(`Image loaded: ${imagesLoaded}/2`);
        if (imagesLoaded === 2) init();
    };

    chainImage.onerror = californiaImage.onerror = () => {
        console.error('Error loading one or more images for Particle Shatter.');
    };

    function init() {
        drawCalifornia();

        const offCanvas = document.createElement("canvas");
        const offCtx = offCanvas.getContext("2d");
        offCanvas.width = chainImage.width;
        offCanvas.height = chainImage.height;
        offCtx.drawImage(chainImage, 0, 0);

        const imageData = offCtx.getImageData(0, 0, chainImage.width, chainImage.height).data;
        generateParticles(imageData, chainImage.width, chainImage.height);
        canvas.animationId = requestAnimationFrame(animate);
    }

    function drawCalifornia() {
        const imgWidth = californiaImage.width;
        const imgHeight = californiaImage.height;
        const scale = Math.min(displayWidth / imgWidth, displayHeight / imgHeight) * 0.8;
        const offsetX = (displayWidth - imgWidth * scale) / 2;
        const offsetY = (displayHeight - imgHeight * scale) / 2;
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(
            californiaImage,
            offsetX,
            offsetY,
            imgWidth * scale,
            imgHeight * scale
        );
    }

    function generateParticles(imageData, imgWidth, imgHeight) {
        const scale = Math.min(displayWidth / imgWidth, displayHeight / imgHeight) * 0.8;
        const offsetX = (displayWidth - imgWidth * scale) / 2;
        const offsetY = (displayHeight - imgHeight * scale) / 2;

        console.log('Generating particles...');
        for (let i = 0; i < particleCount; i++) {
            let found = false;
            let attempts = 0;
            const maxAttempts = 1000;
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
                        radius: getScaledParticleRadius(),
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

    function interpolateColor(color1, color2, ratio) {
        const hexToRgb = (hex) => hex.replace(/^#/, "").match(/.{2}/g).map(x => parseInt(x, 16));
        const rgbToHex = ([r, g, b]) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16).slice(1).toUpperCase();
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * ratio));
        return rgbToHex(result);
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCalifornia();

        if (!shattered) {
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            particles.forEach(p => {
                if (!p.shattered) {
                    p.shattered = true;
                    const distance = pointToCrackDistance(p.x, p.y);
                    if (distance < crackThickness) {
                        const angle = getCrackNormalAngle(p.x, p.y);
                        const speed = 8 + Math.random() * 6;
                        p.vx = Math.cos(angle) * speed;
                        p.vy = Math.sin(angle) * speed;
                    } else {
                        const angle = Math.atan2(p.y - shatterY, p.x - shatterX);
                        const speed = 3 + Math.random() * 3;
                        p.vx = Math.cos(angle) * speed;
                        p.vy = Math.sin(angle) * speed;
                    }
                }
                p.x += p.vx;
                p.y += p.vy;
                ctx.fillStyle = fadeColor(p.color, p.shattered);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        canvas.animationId = requestAnimationFrame(animate);
    }

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

    function getCrackNormalAngle(px, py) {
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
            const dx = closestSeg.x2 - closestSeg.x1;
            const dy = closestSeg.y2 - closestSeg.y1;
            const angle = Math.atan2(dy, dx);
            return angle + Math.PI / 2;
        }
        return 0;
    }

    function fadeColor(color, shattered) {
        if (!shattered) return color;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    }

    function handleShatter(mx, my) {
        if (shattered) return;
        console.log(`Shatter triggered at (${mx}, ${my})`);

        const internalX = mx;
        const internalY = my;

        console.log(`Internal Shatter Point: (${internalX}, ${internalY})`);

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
            let jitter = 0;
            if (i !== 0 && i !== crackSegments) {
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

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyConfirmation();
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyConfirmation();
    } catch (err) {
        console.error('Fallback copy failed: ', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopyConfirmation() {
    const copyButton = document.querySelector('.share-copy');
    if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyButton.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.style.backgroundColor = '';
        }, 2000);
    }
}