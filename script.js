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
        })
        .catch(error => console.error('Error loading header:', error));

    // Setup sticky footer
    setupStickyFooter();

    // Initialize DeclarationComponent if element exists
    if (document.getElementById('declaration-interactive')) {
        new DeclarationComponent('declaration-interactive');
    }
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
 * Retrieves page content from the cache or fetches it if not cached.
 * @param {string} url - The URL of the page.
 * @returns {Promise<string>} The page content.
 */
async function getPageContent(url) {
    if (pageCache.has(url)) {
        return pageCache.get(url);
    }
    const response = await fetch(url);
    const text = await response.text();
    return text;
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