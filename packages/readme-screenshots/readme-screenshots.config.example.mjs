export default {
  url: "http://127.0.0.1:5173",
  outputDir: "docs/screenshots",
  viewport: { width: 1440, height: 1000 },
  screenshots: [
    { name: "playground-overview.png" },
    {
      name: "feature-example.png",
      selector: '[data-readme-screenshot="feature-example"]',
      scrollIntoView: true,
      waitForMs: 500,
    },
  ],
};
