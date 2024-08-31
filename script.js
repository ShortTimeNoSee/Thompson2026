// Sticky Header on Scroll with Shrinking Effect
window.onscroll = throttle(stickyHeader, 100); // Throttle stickyHeader call to once every 100ms during scroll

// Get references to header and its elements
var header = document.getElementById("header");
var sticky = header.offsetTop; // Header's offset position
var h1 = header.querySelector("h1");
var h2 = header.querySelector("h2");

// Manage sticky header behavior and size adjustments
function stickyHeader() {
  if (window.scrollY > sticky) {
      header.classList.add("sticky"); // Add sticky class when scroll position passes header

      // Adjust font sizes and padding based on scroll progress
      let scrollProgress = Math.min(window.scrollY / sticky, 1); // Calculate scroll progress (0 to 1)
      h1.style.fontSize = (2 - 0.5 * scrollProgress) + "em"; // Scale h1 font-size
      h2.style.fontSize = (1.2 - 0.2 * scrollProgress) + "em"; // Scale h2 font-size
      header.style.padding = (10 - 5 * scrollProgress) + "px 0"; // Adjust padding
  } else {
      // Reset header when at top
      header.classList.remove("sticky"); // Remove sticky class
      h1.style.fontSize = "2em"; // Reset h1 font-size
      h2.style.fontSize = "1.2em"; // Reset h2 font-size
      header.style.padding = "10px 0"; // Reset padding
  }
}

// Throttle function to limit execution frequency
function throttle(func, limit) {
  let lastFunc;
  let lastRan;

  return function(...args) {
      const context = this;
      if (!lastRan) {
          func.apply(context, args); // Run immediately if first call
          lastRan = Date.now();
      } else {
          clearTimeout(lastFunc); // Clear last scheduled call
          lastFunc = setTimeout(function() {
              if ((Date.now() - lastRan) >= limit) {
                  func.apply(context, args); // Execute if time passed since last run exceeds limit
                  lastRan = Date.now();
              }
          }, limit - (Date.now() - lastRan));
      }
  };
}

// Smooth Scroll for Anchor Links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    if (targetId.startsWith('#')) { // Only handle internal links
      e.preventDefault(); // Prevent default behavior
      document.querySelector(targetId).scrollIntoView({ behavior: 'smooth' }); // Smooth scroll to target
    }
  });
});

// Hamburger Menu Toggle
const hamburger = document.getElementById('hamburger'); // Get hamburger icon
const navLinks = document.getElementById('nav-links'); // Get nav links container

hamburger.addEventListener('click', function() {
  navLinks.classList.toggle('active'); // Toggle active class on nav links
  hamburger.classList.toggle('active'); // Toggle active class on hamburger icon
});

// Sticky Footer
document.addEventListener("DOMContentLoaded", function() {
    const footer = document.createElement("div");
    footer.className = "sticky-footer"; // Assign sticky-footer class
    footer.innerHTML = `<p><a href="https://registertovote.ca.gov/" target="_blank" style="color: #fed000;">Click here</a> to register to vote in California; support Nicholas A. Thompson in 2026!</p>`;
    document.body.appendChild(footer); // Add footer to body

    const stickyFooter = document.querySelector('.sticky-footer'); // Get sticky footer
    const pageFooter = document.querySelector('footer'); // Get main footer

    if (pageFooter) {
        // Observe when main footer enters view
        const footerObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    stickyFooter.classList.add('hidden'); // Hide sticky footer
                } else {
                    stickyFooter.classList.remove('hidden'); // Show sticky footer
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of main footer is visible

        footerObserver.observe(pageFooter); // Start observing main footer
    }
});