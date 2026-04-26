/**
 * Unit tests for hostname/destination validators (inlined from background.js)
 * Run with: node --test tests/unit/bounce-validate.test.js
 */

const assert = require("node:assert");
const test = require("node:test");

function isValidHostname(h) {
  return typeof h === "string" && h.length > 0 && h.length < 256 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h);
}

function isValidDestination(dest) {
  if (typeof dest !== "string" || dest.length > 4096) return false;
  try {
    const u = new URL(dest);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.length > 0;
  } catch { return false; }
}

test("isValidHostname accepts valid hostnames", () => {
  assert.strictEqual(isValidHostname("example.com"), true);
  assert.strictEqual(isValidHostname("sub.example.com"), true);
  assert.strictEqual(isValidHostname("xn--caf-dma.com"), true);
  assert.strictEqual(isValidHostname("a.co"), true);
});

test("isValidHostname rejects invalid inputs", () => {
  assert.strictEqual(isValidHostname(""), false);
  assert.strictEqual(isValidHostname(123), false);
  assert.strictEqual(isValidHostname(null), false);
  assert.strictEqual(isValidHostname("-example.com"), false);
  assert.strictEqual(isValidHostname("example-.com"), false);
  assert.strictEqual(isValidHostname("example..com"), false);
  assert.strictEqual(isValidHostname("a".repeat(256)), false);
  assert.strictEqual(isValidHostname("https://example.com"), false);
});

test("isValidDestination accepts HTTP(S) URLs", () => {
  assert.strictEqual(isValidDestination("https://example.com/path"), true);
  assert.strictEqual(isValidDestination("http://example.com"), true);
  assert.strictEqual(isValidDestination("https://sub.example.com/path?q=1"), true);
});

test("isValidDestination rejects non-HTTP URLs and invalid inputs", () => {
  assert.strictEqual(isValidDestination("ftp://example.com"), false);
  assert.strictEqual(isValidDestination("chrome://extensions"), false);
  assert.strictEqual(isValidDestination(""), false);
  assert.strictEqual(isValidDestination("not-a-url"), false);
  assert.strictEqual(isValidDestination(null), false);
  assert.strictEqual(isValidDestination(123), false);
  assert.strictEqual(isValidDestination("x".repeat(4097)), false);
});
