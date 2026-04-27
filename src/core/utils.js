/**
 * openShield Pure Utility Functions
 * Zero side effects. All functions are testable in Node.js.
 */
export function hostname(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

export function isBrowser(url) {
  return !url || /^((chrome|edge|brave|about|chrome-extension|moz-extension):\/\/)/.test(url);
}

export function normHost(h) {
  return (h || "").replace(/^www\./, "").toLowerCase();
}

export function seed() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deterministic PRNG returning [0, 1) from a seed string.
 * Uses xorshift32 with seed hashing.
 * @param {string} seedStr
 * @param {number} [n=0] - Offset for generating multiple values from same seed
 * @returns {number}
 */
export function rand(seedStr, n = 0) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  s = (s + n) >>> 0;
  s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
  return (s >>> 0) / 4294967296;
}

/**
 * Deep merge with prototype pollution protection.
 * @param {object} base
 * @param {object} over
 * @returns {object}
 */
export function merge(base, over) {
  if (base === null || typeof base !== "object") base = {};
  if (over === null || typeof over !== "object") return base;
  const r = { ...base };
  for (const k of Object.keys(over)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    const v = over[k];
    r[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(r[k], v) : v;
  }
  return r;
}

/**
 * Deterministic hash for string (domain-based DNR rule IDs).
 * @param {string} s
 * @param {number} base
 * @param {number} range
 * @returns {number}
 */
export function hashForId(s, base, range) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return base + (h % range);
}

export function extractDomain(s) {
  try {
    const u = new URL(s.includes("://") ? s : "https://" + s);
    return u.hostname;
  } catch { return s; }
}

export function isAMP(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "www.google.com" && u.pathname.startsWith("/amp/")) return true;
    if (u.hostname.endsWith(".ampproject.org")) return true;
    return false;
  } catch { return false; }
}

export function extractAMPCanonical(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * Safe Chrome API wrapper with error handling.
 * @param {Function} fn
 * @param {string} [context='']
 * @returns {Promise<any>}
 */
export async function safeApiCall(fn, context = "") {
  try {
    return await fn();
  } catch (err) {
    if (chrome.runtime.lastError) {
      console.warn(`[openShield] ${context}:`, chrome.runtime.lastError.message);
    } else {
      console.error(`[openShield] ${context}:`, err);
    }
    return null;
  }
}

/**
 * Message schema validator for background message handlers.
 * @param {object} message
 * @param {object} schema - { key: "string"|"number"|"boolean"|"array"|"object"|"any" }
 * @returns {boolean}
 */
export function validateMessage(message, schema) {
  if (!message || typeof message !== "object") return false;
  for (const [key, expectedType] of Object.entries(schema)) {
    if (expectedType === "any") continue;
    if (expectedType === "array") { if (!Array.isArray(message[key])) return false; continue; }
    if (typeof message[key] !== expectedType) return false;
  }
  return true;
}

/**
 * Validates a normalized hostname (lowercase, no www, valid chars).
 * @param {string} h
 * @returns {boolean}
 */
export function isValidHostname(h) {
  return typeof h === "string" && h.length > 0 && h.length < 256 &&
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h);
}

/**
 * Validates a destination URL for bounce/AMP redirects.
 * @param {string} dest
 * @returns {boolean}
 */
export function isValidDestination(dest) {
  if (typeof dest !== "string" || dest.length > 4096) return false;
  try {
    const u = new URL(dest);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.length > 0;
  } catch { return false; }
}

/**
 * Checks if a URL hostname is in the allowed fetch hosts list.
 * @param {string} url
 * @param {string[]} allowedHosts
 * @returns {boolean}
 */
export function isValidSourceURL(url, allowedHosts) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && allowedHosts.includes(u.hostname);
  } catch { return false; }
}
