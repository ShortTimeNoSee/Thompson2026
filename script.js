// Header HTML
fetch('header.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('header-container').innerHTML = data;
        setActiveLink();
    })
    .catch(error => console.error('Error loading header:', error));

// Function to set the active link based on the current URL
function setActiveLink() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        // only add the active class if the path exactly matches the href attribute
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active'); // remove active class if it doesn't match
        }
    });
}

// Sticky Header on Scroll with Shrinking Effect
window.onscroll = throttle(stickyHeader, 100); 

// Get references to header and its elements
var header = document.getElementById("header");
var h1, h2;
var sticky = header ? header.offsetTop : 0;

// Manage sticky header behavior and size adjustments
function stickyHeader() {
  if (window.scrollY > sticky && header) {
      header.classList.add("sticky");
      h1 = h1 || header.querySelector("h1");
      h2 = h2 || header.querySelector("h2");
      let scrollProgress = Math.min(window.scrollY / sticky, 1); 
      h1.style.fontSize = (2 - 0.5 * scrollProgress) + "em";
      h2.style.fontSize = (1.2 - 0.2 * scrollProgress) + "em";
      header.style.padding = (10 - 5 * scrollProgress) + "px 0";
  } else if (header) {
      header.classList.remove("sticky");
      h1.style.fontSize = "2em";
      h2.style.fontSize = "1.2em";
      header.style.padding = "10px 0";
  }
}

// Throttle function to limit execution frequency
function throttle(func, limit) {
  let lastFunc;
  let lastRan;

  return function(...args) {
      const context = this;
      if (!lastRan) {
          func.apply(context, args);
          lastRan = Date.now();
      } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(function() {
              if ((Date.now() - lastRan) >= limit) {
                  func.apply(context, args);
                  lastRan = Date.now();
              }
          }, limit - (Date.now() - lastRan));
      }
  };
}

// Hamburger Menu Toggle
document.addEventListener("DOMContentLoaded", function() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
});

// Sticky Footer
document.addEventListener("DOMContentLoaded", function() {
    const footer = document.createElement("div");
    footer.className = "sticky-footer";
    footer.innerHTML = `<p><a href="https://registertovote.ca.gov/" target="_blank" style="color: #FED000;">Click here</a> to register to vote in California; support Nicholas in 2026!</p>`;
    document.body.appendChild(footer);

    const stickyFooter = document.querySelector('.sticky-footer');
    const pageFooter = document.querySelector('footer');

    if (pageFooter) {
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