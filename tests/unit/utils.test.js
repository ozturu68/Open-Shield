/**
 * Unit tests for src/utils.js
 */
const assert = require("node:assert");
const test = require("node:test");

async function load() { return import("../../src/utils.js"); }

test("hostname extracts hostname", async () => {
  const { hostname } = await load();
  assert.strictEqual(hostname("https://example.com/path"), "example.com");
  assert.strictEqual(hostname("bad"), "");
});

test("isBrowser detects internal pages", async () => {
  const { isBrowser } = await load();
  assert.strictEqual(isBrowser("chrome://extensions"), true);
  assert.strictEqual(isBrowser("https://site.com"), false);
  assert.strictEqual(isBrowser(""), true);
});

test("normHost strips www", async () => {
  const { normHost } = await load();
  assert.strictEqual(normHost("www.Example.COM"), "example.com");
});

test("seed returns 32-char hex", async () => {
  const { seed } = await load();
  const s = seed();
  assert.strictEqual(s.length, 32);
  assert.match(s, /^[0-9a-f]{32}$/);
});

test("rand is deterministic", async () => {
  const { rand } = await load();
  const a = rand("abc", 0);
  const b = rand("abc", 0);
  const c = rand("abc", 1);
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.ok(a >= 0 && a < 1);
});

test("merge prevents prototype pollution", async () => {
  const { merge } = await load();
  const before = {}.polluted;
  merge({ a: 1 }, { __proto__: { polluted: true } });
  assert.strictEqual({}.polluted, before);
  merge({ a: 1 }, { constructor: { prototype: { polluted2: true } } });
  assert.strictEqual({}.polluted2, undefined);
  const r = merge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });
  assert.deepStrictEqual(r, { a: 1, b: { c: 2, d: 3 } });
});

test("hashForId produces deterministic output", async () => {
  const { hashForId } = await load();
  const a = hashForId("example.com", 100000, 50000);
  const b = hashForId("example.com", 100000, 50000);
  assert.strictEqual(a, b);
  assert.ok(a >= 100000 && a < 150000);
});

test("hashForId produces different output for different inputs", async () => {
  const { hashForId } = await load();
  const a = hashForId("example.com", 100000, 50000);
  const b = hashForId("other.org", 100000, 50000);
  assert.notStrictEqual(a, b);
});

test("extractDomain extracts from URLs", async () => {
  const { extractDomain } = await load();
  assert.strictEqual(extractDomain("https://example.com/path"), "example.com");
  assert.strictEqual(extractDomain("example.com"), "example.com");
  assert.strictEqual(extractDomain("sub.example.co.uk"), "sub.example.co.uk");
});

test("isAMP detects AMP pages", async () => {
  const { isAMP } = await load();
  assert.strictEqual(isAMP("https://www.google.com/amp/s/example.com"), true);
  assert.strictEqual(isAMP("https://example-com.cdn.ampproject.org/c/example.com"), true);
  assert.strictEqual(isAMP("https://example.com/normal"), false);
});

test("extractAMPCanonical extracts link tag", async () => {
  const { extractAMPCanonical } = await load();
  const html = '<html><head><link rel="canonical" href="https://example.com/page"></head><body></body></html>';
  assert.strictEqual(extractAMPCanonical(html), "https://example.com/page");
  assert.strictEqual(extractAMPCanonical("<html></html>"), null);
});
