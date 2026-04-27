/**
 * Pure utility functions.
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

export function rand(seedStr, n = 0) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  s = (s + n) >>> 0;
  s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
  return (s >>> 0) / 4294967296;
}

export function merge(base, over) {
  const r = { ...base };
  for (const k in over) {
    if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    const v = over[k];
    r[k] = v !== null && typeof v === "object" && !Array.isArray(v)
      ? merge(base[k], v) : v;
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

/**
 * Extract domain from any URL or domain string.
 * @param {string} s
 * @returns {string}
 */
export function extractDomain(s) {
  try {
    const u = new URL(s.includes("://") ? s : "https://" + s);
    return u.hostname;
  } catch { return s; }
}

/**
 * Check if a URL is a Google AMP page.
 * @param {string} url
 * @returns {boolean}
 */
export function isAMP(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "www.google.com" && u.pathname.startsWith("/amp/")) return true;
    if (u.hostname.endsWith(".ampproject.org")) return true;
    return false;
  } catch { return false; }
}

/**
 * Extract canonical URL from AMP page content.
 * @param {string} html
 * @returns {string|null}
 */
export function extractAMPCanonical(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * Safe Chrome API wrapper with error handling.
 * @param {Function} fn - Async function to execute
 * @param {string} [context=''] - Context for error messages
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
 * @param {object} message - The message to validate
 * @param {object} schema - The schema to validate against
 * @returns {boolean}
 */
export function validateMessage(message, schema) {
  if (!message || typeof message !== "object") return false;
  for (const [key, expectedType] of Object.entries(schema)) {
    if (expectedType === "any") continue;
    if (typeof message[key] !== expectedType) return false;
  }
  return true;
}
