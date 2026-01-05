module.exports = {
  content: [
    './_site/**/*.html',
    './_site/**/*.js',
  ],
  css: ['./dist/styles.min.css'],
  safelist: {
    standard: [
      /fa[srbdl]?-?/, // Font Awesome classes
      /blog-feed-inline/,
      /active/,
      /sticky/,
      /dropdown/,
      /post-card/,
      /issue-card/,
      /action-prompt/,
      /sticky-footer/,
      /comment/,
      /vote/,
      /reply/,
      /sort/,
      /reported/,
      /highlighted/,
      /positive/,
      /negative/,
      /voted/,
      /author-badge/,
      /checkbox/,
      /quick-action/,
      /copy-comment/,
      /report-modal/,
    ],
  },
  output: '.',
  rejected: false,
};


