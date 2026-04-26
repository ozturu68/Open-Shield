/**
 * Browser API Polyfill — Firefox / Chromium compatibility
 * ESM module. First import in background.js.
 * Provides a unified `browser` object that works in both Firefox and Chrome.
 */
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

export { browserAPI as browser };

export function api() {
  return typeof browser !== "undefined" ? browser : chrome;
}
