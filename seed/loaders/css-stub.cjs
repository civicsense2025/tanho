// tsx's CJS interop resolves .tsx imports via require(), which never reaches
// Node's ESM loader hooks. Block defs import their Render component's CSS
// module for the Next.js build; stub .css files at the CJS Module level so
// seed scripts can load block defs for their metadata without a bundler.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS-only API (Module._extensions), require() is required
const Module = require("node:module");

Module._extensions[".css"] = function stubCss(module) {
  module.exports = {};
};
