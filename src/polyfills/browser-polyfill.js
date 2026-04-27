/**
 * Browser API compatibility shim.
 * Firefox uses `browser`, Chromium uses `chrome`.
 */
export const browserAPI = typeof browser !== "undefined" ? browser : chrome;
