// Create a global object to hold site-wide functions and state
window.site = {
    pageCache: new Map(),
    header: null,
    h1: null,
    h2: null,
    sticky: 0,
    
    // This function will be called AFTER the header is fetched and injected
    initHeader: function() {
        this.header = document.getElementById("header");
        if (!this.header) {
            console.error("Header initialization failed: #header element not found.");
            return;
        }
        this.sticky = this.header.offsetTop;
        this.h1 = this.header.querySelector("h1");
        this.h2 = this.header.querySelector("h2");
                
        // Setup all header-dependent functionalities
        this.setActiveLink();
        this.setupHamburgerToggle();
        this.setupPreloadListeners();
        
        // Re-bind the throttled scroll event handler for the sticky header
        window.addEventListener('scroll', this.throttle(this.stickyHeader.bind(this), 100));
    },

    setActiveLink: function() {
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
    },

    stickyHeader: function() {
        if (!this.header) return;

        if (window.scrollY > this.sticky) {
            this.header.classList.add("sticky");
            const scrollProgress = Math.min(window.scrollY / this.sticky, 1);
            
            if (window.innerWidth > 768) {
                if (this.h1) this.h1.style.fontSize = `${2 - 0.5 * scrollProgress}em`;
                if (this.h2) this.h2.style.fontSize = `${1.2 - 0.2 * scrollProgress}em`;
            }
            this.header.style.padding = `${10 - 5 * scrollProgress}px 0`;
        } else {
            this.header.classList.remove("sticky");
            if (window.innerWidth > 768) {
                if (this.h1) this.h1.style.fontSize = "2em";
                if (this.h2) this.h2.style.fontSize = "1.2em";
            }
            this.header.style.padding = "10px 0";
        }
    },

    setupHamburgerToggle: function() {
        const hamburger = document.getElementById('hamburger');
        const nav = document.querySelector('nav ul');
        const body = document.body;

        if (!hamburger || !nav) {
            console.error("Hamburger menu setup failed: elements not found.");
            return;
        }

        hamburger.innerHTML = '<div></div>'; // Create the visual bars

        const toggleMenu = () => {
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
            body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        };

        const closeMenu = () => {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
            body.style.overflow = '';
        };

        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });

        const dropBtn = document.querySelector('.dropbtn');
        if (dropBtn) {
            dropBtn.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                }
            });
        }

        nav.querySelectorAll('a:not(.dropbtn)').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') && !nav.contains(e.target) && !hamburger.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        });
    },
    
    // --- NON-HEADER-DEPENDENT FUNCTIONS ---
    
    initNonHeader: function() {
        this.setupStickyFooter();
        this.initializeIssueCards();
        this.initParticleShatter();
    },

    setupStickyFooter: function() {
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
    },

    preloadPage: async function(url) {
        if (this.pageCache.has(url)) return;
        try {
            const response = await fetch(url);
            const text = await response.text();
            this.pageCache.set(url, text);
        } catch (error) {
            console.error(`Failed to preload ${url}:`, error);
        }
    },

    setupPreloadListeners: function() {
        const links = document.querySelectorAll('nav a:not([target="_blank"])');
        links.forEach(link => {
            let timer;
            link.addEventListener('mouseenter', () => {
                timer = setTimeout(() => {
                    const url = link.href;
                    if (url && !url.startsWith('javascript:')) {
                        this.preloadPage(url);
                    }
                }, 100);
            });
            link.addEventListener('mouseleave', () => clearTimeout(timer));
        });
    },

    initializeIssueCards: function() {
        const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const actionText = isTouchDevice ? "Tap to Learn More" : "Click to Learn More";
        const cards = document.querySelectorAll(".issue-card");

        cards.forEach((card) => {
            card.addEventListener("click", () => card.classList.toggle("flipped"));

            const frontFace = card.querySelector(".front");
            if (frontFace && !frontFace.querySelector(".action-prompt")) {
                const actionPrompt = document.createElement("div");
                actionPrompt.className = "action-prompt";
                actionPrompt.textContent = actionText;
                frontFace.appendChild(actionPrompt);
            }
        });
    },

    initParticleShatter: function() {
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) return;
        
        const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
        if (!isHomePage) return;

        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!canvas.animationStarted) {
                        canvas.animationStarted = true;
                        this.startParticleAnimation(canvas);
                    }
                } else {
                    if (canvas.animationId) {
                        cancelAnimationFrame(canvas.animationId);
                        canvas.animationId = null;
                        canvas.animationStarted = false;
                    }
                }
            });
        }, { rootMargin: '50px' });
        
        observer.observe(canvas);
    },
    
    startParticleAnimation: function(canvas) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        const CHAIN_IMAGE_PATH = '/resources/chain_shape.png';
        const CALIFORNIA_IMAGE_PATH = '/resources/california_outline.png';
        const ctx = canvas.getContext("2d");
        let imagesLoaded = 0;
        let displayWidth, displayHeight;
        const particles = [];
        const particleCount = 2000;
        const baseParticleRadius = 4;
        let shattered = false;
        let shatterX = 0, shatterY = 0;
        const clickPadding = 10;
        let crackPath = [];
        const crackSegments = 20;
        const crackJitter = 15;
        const crackThickness = 10;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            displayWidth = rect.width;
            displayHeight = rect.height;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            if (imagesLoaded === 2) drawCalifornia();
        };
        
        const chainImage = new Image();
        const californiaImage = new Image();

        const init = () => {
            drawCalifornia();
            const offCanvas = document.createElement("canvas");
            const offCtx = offCanvas.getContext("2d");
            offCanvas.width = chainImage.width;
            offCanvas.height = chainImage.height;
            offCtx.drawImage(chainImage, 0, 0);
            const imageData = offCtx.getImageData(0, 0, chainImage.width, chainImage.height).data;
            generateParticles(imageData, chainImage.width, chainImage.height);
            canvas.animationId = requestAnimationFrame(animate);
        };

        chainImage.onload = californiaImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === 2) init();
        };

        chainImage.onerror = californiaImage.onerror = () => console.error('Error loading one or more images for Particle Shatter.');
        
        chainImage.src = CHAIN_IMAGE_PATH;
        californiaImage.src = CALIFORNIA_IMAGE_PATH;

        const drawCalifornia = () => {
            const imgWidth = californiaImage.width;
            const imgHeight = californiaImage.height;
            const scale = Math.min(displayWidth / imgWidth, displayHeight / imgHeight) * 0.8;
            const offsetX = (displayWidth - imgWidth * scale) / 2;
            const offsetY = (displayHeight - imgHeight * scale) / 2;
            ctx.clearRect(0, 0, displayWidth, displayHeight);
            ctx.drawImage(californiaImage, offsetX, offsetY, imgWidth * scale, imgHeight * scale);
        };

        const generateParticles = (imageData, imgWidth, imgHeight) => {
            const scale = Math.min(displayWidth / imgWidth, displayHeight / imgHeight) * 0.8;
            const offsetX = (displayWidth - imgWidth * scale) / 2;
            const offsetY = (displayHeight - imgHeight * scale) / 2;

            for (let i = 0; i < particleCount; i++) {
                let found = false, attempts = 0, maxAttempts = 1000;
                while (!found && attempts < maxAttempts) {
                    const x = Math.floor(Math.random() * imgWidth);
                    const y = Math.floor(Math.random() * imgHeight);
                    const alpha = imageData[(y * imgWidth + x) * 4 + 3];
                    if (alpha > 0) {
                        found = true;
                        const transparency = alpha / 255;
                        const color = this.interpolateColor("#FED000", "#776600", transparency);
                        particles.push({
                            x: x * scale + offsetX, y: y * scale + offsetY,
                            color, radius: Math.max(1, baseParticleRadius * (Math.min(displayWidth, displayHeight) / 350) * 0.6),
                            shattered: false, vx: 0, vy: 0
                        });
                    }
                    attempts++;
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawCalifornia();

            particles.forEach(p => {
                if (shattered && !p.shattered) {
                    p.shattered = true;
                    // Simplified shatter logic for brevity
                    const angle = Math.atan2(p.y - shatterY, p.x - shatterX);
                    const speed = 3 + Math.random() * 3;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                }
                
                if (p.shattered) {
                    p.x += p.vx;
                    p.y += p.vy;
                }

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            
            canvas.animationId = requestAnimationFrame(animate);
        };

        const handleShatter = (mx, my) => {
            if (shattered) return;
            shattered = true;
            shatterX = mx;
            shatterY = my;
        };
        
        canvas.addEventListener("click", e => handleShatter(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top));
        canvas.addEventListener("touchstart", e => handleShatter(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top));

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
    },

    // --- UTILITY FUNCTIONS ---
    
    throttle: function(func, limit) {
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
    },
    
    interpolateColor: function(color1, color2, ratio) {
        const hexToRgb = (hex) => hex.replace(/^#/, "").match(/.{2}/g).map(x => parseInt(x, 16));
        const rgbToHex = ([r, g, b]) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * ratio));
        return rgbToHex(result);
    }
};

// This listener now only initializes things that are NOT dependent on the fetched header.
document.addEventListener("DOMContentLoaded", () => {
    window.site.initNonHeader();
});

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
