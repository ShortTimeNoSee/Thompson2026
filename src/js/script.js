// Create a global object to hold site-wide functions and state
window.site = {
    pageCache: new Map(),
    prefetchedUrls: new Set(),
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
                
        this.setActiveLink();
        this.setupHamburgerToggle();
        this.setupQuickActions();
        this.setupPreloadListeners();
        
        const onScroll = this.throttle(() => {
            window.requestAnimationFrame(() => this.stickyHeader());
        }, 100);
        window.addEventListener('scroll', onScroll, { passive: true });
    },

    setActiveLink: function() {
        const path = window.location.pathname;
        const bodyId = document.body.id;
        const navLinks = document.querySelectorAll('.nav-item, .mobile-nav-section a');

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

        if (window.scrollY > 50) {
            this.header.classList.add("scrolled");
        } else {
            this.header.classList.remove("scrolled");
        }
    },

    setupHamburgerToggle: function() {
        const hamburger = document.getElementById('hamburger');
        const mobileNav = document.getElementById('mobile-nav');
        const closeBtn = document.querySelector('.mobile-nav-close');
        const body = document.body;

        if (!hamburger || !mobileNav) {
            return;
        }

        const closeMenu = () => {
            mobileNav.classList.remove('active');
            body.style.overflow = '';
            hamburger.setAttribute('aria-expanded', 'false');
        };

        const toggleMenu = () => {
            const isOpen = mobileNav.classList.contains('active');
            mobileNav.classList.toggle('active');
            body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
            hamburger.setAttribute('aria-expanded', mobileNav.classList.contains('active') ? 'true' : 'false');
        };

        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeMenu);
        }

        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            if (mobileNav.classList.contains('active') && 
                !mobileNav.contains(e.target) && 
                !hamburger.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                closeMenu();
            }
        });
    },

    setupQuickActions: function() {
        const trigger = document.querySelector('.quick-actions-trigger');
        const menu = document.querySelector('.quick-actions-menu');

        if (!trigger || !menu) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = trigger.getAttribute('aria-expanded') === 'true';
            trigger.setAttribute('aria-expanded', !isOpen);
            
            if (!isOpen) {
                document.addEventListener('click', closeQuickActions);
            }
        });

        function closeQuickActions(e) {
            if (!menu.contains(e.target) && e.target !== trigger) {
                trigger.setAttribute('aria-expanded', 'false');
                document.removeEventListener('click', closeQuickActions);
            }
        }
    },
    
    // --- NON-HEADER-DEPENDENT FUNCTIONS ---
    
    initNonHeader: function() {
        this.setupStickyFooter();
        this.initializeIssueCards();
        this.initParticleShatter();
        this.initEmailLinks();
    },

    setupStickyFooter: function() {
        const footer = document.createElement("div");
        footer.className = "sticky-footer";
        footer.innerHTML = `<p><a href="https://registertovote.ca.gov/" target="_blank" rel="noopener" class="register-link">Register to vote at registertovote.ca.gov</a> to support Nicholas in 2026</p>`;
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

    preloadPage: function(url) {
        try {
            const target = new URL(url, window.location.href);
            if (target.origin !== window.location.origin) return;
            if (this.pageCache.has(target.href) || this.prefetchedUrls.has(target.href)) return;

            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn && (conn.saveData || (conn.effectiveType && /^(2g)$/i.test(conn.effectiveType)))) return;

            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = target.href;
            link.as = 'document';
            document.head.appendChild(link);
            this.prefetchedUrls.add(target.href);
        } catch {}
    },

    setupPreloadListeners: function() {
        const links = document.querySelectorAll('nav a:not([target="_blank"])');
        links.forEach(link => {
            let timer;
            link.addEventListener('mouseenter', () => {
                timer = setTimeout(() => {
                    const url = link.href;
                    if (
                        url &&
                        !/^\s*(javascript:|data:|vbscript:)/i.test(url)
                    ) {
                        try {
                            const sameOrigin = new URL(url, window.location.href).origin === window.location.origin;
                            if (sameOrigin) {
                                this.preloadPage(url);
                            }
                        } catch (e) {
                        }
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
        const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
        if (!isHomePage) return;

        const canvas = document.getElementById('ballotParticleCanvas');
        if (!canvas) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!canvas.animationStarted) {
                        canvas.animationStarted = true;
                        const start = () => this.startParticleAnimation(canvas);
                        if ('requestIdleCallback' in window) {
                            window.requestIdleCallback(start, { timeout: 500 });
                        } else {
                            window.requestAnimationFrame(start);
                        }
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
        const CHAIN_IMAGE_PATH = '/resources/chain_shape.webp';
        const CALIFORNIA_IMAGE_PATH = '/resources/california_outline.png';
        const ctx = canvas.getContext("2d");
        let imagesLoaded = 0;
        let displayWidth, displayHeight;
        const particles = [];
        const particleCount = 4500;
        const baseParticleRadius = 2.2;
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
            setTimeout(showClickHint, 3500);
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
            hideClickHint();
        };
        
        const showClickHint = () => {
            if (shattered) return;
            const visualContainer = canvas.closest('.ballot-visual');
            if (!visualContainer) return;
            
            let hint = visualContainer.querySelector('.canvas-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.className = 'canvas-hint';
                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                hint.textContent = isTouchDevice ? 'Tap to break the chain' : 'Click to break the chain';
                visualContainer.appendChild(hint);
            }
            
            setTimeout(() => {
                if (!shattered && hint.parentNode) {
                    hint.classList.add('visible');
                    setTimeout(() => {
                        if (hint.parentNode && !shattered) {
                            hint.classList.remove('visible');
                            setTimeout(() => {
                                if (hint.parentNode && !shattered) {
                                    hint.remove();
                                }
                            }, 500);
                        }
                    }, 3000);
                }
            }, 100);
        };
        
        const hideClickHint = () => {
            const visualContainer = canvas.closest('.ballot-visual');
            if (visualContainer) {
                const hint = visualContainer.querySelector('.canvas-hint');
                if (hint) {
                    hint.classList.remove('visible');
                    setTimeout(() => hint.remove(), 500);
                }
            }
        };
        
        canvas.addEventListener("click", e => handleShatter(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top));
        canvas.addEventListener("touchstart", e => handleShatter(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top));

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
    },

    initEmailLinks: function() {
        try {
            document.querySelectorAll('a.email-link[data-user][data-domain]').forEach(a => {
                a.addEventListener('click', (e) => {
                    const user = a.getAttribute('data-user');
                    const domain = a.getAttribute('data-domain');
                    if (!user || !domain) return;
                    const addr = `${user}@${domain}`;
                    a.href = `mailto:${addr}`;
                }, { once: true });
            });
        } catch {}
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

// Initialize header-dependent features (header is inline now), then non-header features
document.addEventListener("DOMContentLoaded", () => {
    window.site.initHeader();
    const startNonCritical = () => window.site.initNonHeader();
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(startNonCritical, { timeout: 1200 });
    } else {
        window.requestAnimationFrame(startNonCritical);
    }
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
