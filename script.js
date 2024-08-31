// Sticky Header on Scroll with Shrinking Effect
window.onscroll = function() {
  stickyHeader(); // Call stickyHeader function when the user scrolls
};

// Get references to the header element and its child elements (h1 and h2)
var header = document.getElementById("header");
var sticky = header.offsetTop; // Get the offset position of the header
var h1 = header.querySelector("h1");
var h2 = header.querySelector("h2");

function stickyHeader() {
  // Check if the page has been scrolled past the header's initial position
  if (window.scrollY > sticky) {
      header.classList.add("sticky"); // Add 'sticky' class to header when it becomes sticky

      // Calculate the scroll progress (0 to 1) to dynamically adjust the font-size and padding
      let scrollProgress = Math.min(window.scrollY / sticky, 1); // Limits the value of scrollProgress to a max of 1

      // Adjust font sizes and padding based on scroll progress
      h1.style.fontSize = (2 - 0.5 * scrollProgress) + "em"; // Reduces h1 font-size from 2em to 1.5em
      h2.style.fontSize = (1.2 - 0.2 * scrollProgress) + "em"; // Reduces h2 font-size from 1.2em to 1em
      header.style.padding = (10 - 5 * scrollProgress) + "px 0"; // Reduces padding from 10px to 5px

  } else {
      header.classList.remove("sticky"); // Remove 'sticky' class when the header is not sticky
      h1.style.fontSize = "2em"; // Reset h1 font-size to default
      h2.style.fontSize = "1.2em"; // Reset h2 font-size to default
      header.style.padding = "10px 0"; // Reset padding to default
  }
}

// Smooth Scroll for Anchors within the Same Page
// Add smooth scrolling behavior for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    // Check if the link is an anchor within the same page
    if (targetId.startsWith('#')) {
      e.preventDefault(); // Prevent default anchor click behavior
      document.querySelector(targetId).scrollIntoView({
        behavior: 'smooth' // Scroll smoothly to the target element
      });
    }
  });
});

// Hamburger Menu Toggle
const hamburger = document.getElementById('hamburger'); // Get the hamburger menu element
const navLinks = document.getElementById('nav-links'); // Get the navigation links element

// Add event listener for hamburger menu click to toggle the active class
hamburger.addEventListener('click', function() {
  navLinks.classList.toggle('active'); // Toggle the active class on the nav links
  hamburger.classList.toggle('active'); // Toggle the active class on the hamburger menu icon
});

// Sticky Footer
document.addEventListener("DOMContentLoaded", function() {
    // Create a sticky footer element with a message
    const footer = document.createElement("div");
    footer.className = "sticky-footer"; // Add the sticky-footer class
    footer.innerHTML = `<p><a href="https://registertovote.ca.gov/" target="_blank">Click here</a> to register to vote in California; support Nicholas A. Thompson in 2026!</p>`;
    document.body.appendChild(footer); // Append the sticky footer to the body

    const stickyFooter = document.querySelector('.sticky-footer'); // Get the sticky footer element
    const pageFooter = document.querySelector('footer'); // Get the page footer element

    if (pageFooter) {
        // Observe when the page footer comes into view to hide the sticky footer
        const footerObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    stickyFooter.classList.add('hidden'); // Hide sticky footer when page footer is visible
                } else {
                    stickyFooter.classList.remove('hidden'); // Show sticky footer when page footer is not visible
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the page footer is visible

        footerObserver.observe(pageFooter); // Start observing the page footer
    }
});