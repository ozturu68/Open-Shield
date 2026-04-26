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

test("seed returns 8-char hex", async () => {
  const { seed } = await load();
  const s = seed();
  assert.strictEqual(s.length, 8);
  assert.match(s, /^[0-9a-f]{8}$/);
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

test("merge deep merges objects", async () => {
  const { merge } = await load();
  const r = merge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });
  assert.deepStrictEqual(r, { a: 1, b: { c: 2, d: 3 } });
});
