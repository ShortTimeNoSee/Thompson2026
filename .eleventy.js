module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("dist");
  eleventyConfig.addPassthroughCopy("resources");
  eleventyConfig.addPassthroughCopy("admin");
  
  eleventyConfig.addPassthroughCopy({"src/header.html": "header.html"});
  
  eleventyConfig.addPassthroughCopy("script.js");
  eleventyConfig.addPassthroughCopy("declaration-interactive.js");
  eleventyConfig.addPassthroughCopy("worker.js");

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/blog/*.md");
  });

  eleventyConfig.addFilter("striptags", function(str) {
    return str.replace(/<[^>]*>/g, "");
  });

  eleventyConfig.addFilter("truncate", function(str, length) {
    if (str.length <= length) return str;
    return str.substr(0, length) + "...";
  });

  eleventyConfig.addFilter("limit", function(arr, limit) {
    return arr.slice(0, limit);
  });

  eleventyConfig.addFilter("date", function(dateObj, format) {
    const date = new Date(dateObj);
    
    if (format === 'Y-m-d') {
      return date.getFullYear() + '-' + 
             String(date.getMonth() + 1).padStart(2, '0') + '-' + 
             String(date.getDate()).padStart(2, '0');
    }
    
    if (format === 'F d, Y') {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
    }
    
    return dateObj;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["html", "md", "njk"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
