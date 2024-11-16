// load header HTML, set active link, setup hamburger toggle, preload setup
document.addEventListener("DOMContentLoaded", function () {
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
            setActiveLink();
            setupHamburgerToggle();
            setupPreloadListeners();
        })
        .catch(error => console.error('Error loading header:', error));
});

// set active nav link based on current URL
function setActiveLink() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Check if link matches current path or if home page
        if ((href === path) || (path === '/' && href === '/index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// sticky header with shrink effect
window.onscroll = throttle(stickyHeader, 100);

let header = document.getElementById("header");
let h1, h2;
let sticky = header ? header.offsetTop : 0;

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
        let scrollProgress = Math.min(window.scrollY / sticky, 1);
        if (h1) h1.style.fontSize = (2 - 0.5 * scrollProgress) + "em";
        if (h2) h2.style.fontSize = (1.2 - 0.2 * scrollProgress) + "em";
        header.style.padding = (10 - 5 * scrollProgress) + "px 0";
    } else {
        header.classList.remove("sticky");
        if (h1) h1.style.fontSize = "2em";
        if (h2) h2.style.fontSize = "1.2em";
        header.style.padding = "10px 0";
    }
}

// throttle function for execution rate control
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

// Mobile menu
function setupHamburgerToggle() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.querySelector('nav ul');
    const body = document.body;

    if (hamburger && nav) {
        // Create hamburger lines
        hamburger.innerHTML = '<div></div>';

        // Setup toggle functionality
        hamburger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });

        // Remove click handler from Platform button on mobile
        const dropBtn = document.querySelector('.dropbtn');
        if (dropBtn) {
            dropBtn.addEventListener('click', function(e) {
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
            if (nav.classList.contains('active') && 
                !nav.contains(e.target) && 
                !hamburger.contains(e.target)) {
                closeMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                closeMenu();
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
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

// sticky footer setup
document.addEventListener("DOMContentLoaded", function () {
    const footer = document.createElement("div");
    footer.className = "sticky-footer";
    footer.innerHTML = `<p><a href="https://registertovote.ca.gov/" target="_blank" style="color: #FED000;">Click here</a> to register to vote in California; support Nicholas in 2026!</p>`;
    document.body.appendChild(footer);

    const stickyFooter = document.querySelector('.sticky-footer');
    const pageFooter = document.querySelector('footer');

    if (pageFooter && stickyFooter) {
        const footerObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    stickyFooter.classList.add('hidden');
                } else {
                    stickyFooter.classList.remove('hidden');
                }
            });
        }, { threshold: 0.1 });

        footerObserver.observe(pageFooter);
    }
});

// Create a Map to store preloaded content
const pageCache = new Map();

// preload a page
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

// get page content (either from cache or fresh)
async function getPageContent(url) {
    if (pageCache.has(url)) {
        return pageCache.get(url);
    }
    const response = await fetch(url);
    const text = await response.text();
    return text;
}

// Setup preload listeners
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