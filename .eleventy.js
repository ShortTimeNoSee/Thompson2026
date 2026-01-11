const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Add global data for dev mode detection
  eleventyConfig.addGlobalData("isDev", process.env.NODE_ENV === "development");
  
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("dist");
  eleventyConfig.addPassthroughCopy("resources");
  eleventyConfig.addPassthroughCopy("_headers");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("script.js");
  eleventyConfig.addPassthroughCopy("declaration-interactive.js");
  eleventyConfig.addPassthroughCopy({ "resources/favicon.ico": "/favicon.ico" });
  eleventyConfig.addPassthroughCopy(".well-known");

  // --- UNIVERSAL FILTERS ---

  // Date formatting
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("LLLL d, yyyy");
  });

  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
  });

  // RFC 822 / HTTP-date for RSS
  eleventyConfig.addFilter('rfc822Date', (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toHTTP();
  });

  // ISO 8601 string (UTC) for JSON Feed
  eleventyConfig.addFilter('isoDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toISO();
  });

  // URL Encoding
  eleventyConfig.addFilter("urlencode", str => {
    return encodeURIComponent(str);
  });

  // --- LIQUID-SPECIFIC FILTERS & TAGS ---
  // These are needed to replicate functionality that was previously built-in

  // Custom Liquid filter to strip HTML tags
  eleventyConfig.addLiquidFilter("striptags", function(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '');
  });

  // Custom Liquid filter to mark content as safe (no escaping)
  eleventyConfig.addLiquidFilter("safe", function(value) {
    return value; // In a real setup, use a library like `he` to decode entities if needed
  });

  // Custom Liquid filter to dump objects as JSON (for debugging or structured data)
  eleventyConfig.addLiquidFilter("dump", obj => {
    return JSON.stringify(obj, null, 2);
  });

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/blog/*.md");
  });

  eleventyConfig.addCollection("postsSorted", function(collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/blog/*.md")
      .sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0));
  });

  // Note: post-processing is invoked by package.json build scripts to ensure CI environments run them

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes",
      data: "_data"
    }
  };
};
