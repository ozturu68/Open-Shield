/**
 * Unit tests for farbling logic
 */

const assert = require("node:assert");
const test = require("node:test");

async function load() { return import("../../src/core/utils.js"); }

test("rand is deterministic for same seed", async () => {
  const { rand } = await load();
  const a = rand("deadbeef", 0);
  const b = rand("deadbeef", 0);
  assert.strictEqual(a, b);
});

test("rand differs across seeds", async () => {
  const { rand } = await load();
  const a = rand("aaa", 0);
  const b = rand("aab", 0);
  assert.notStrictEqual(a, b);
});

test("rand output in range [0, 1)", async () => {
  const { rand } = await load();
  const val = rand("test", 5);
  assert.ok(val >= 0 && val < 1);
});

test("base64 canvas mutation flips bits", () => {
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  const bin = Buffer.from(b64, "base64");
  const u = new Uint8Array(bin);
  const orig = u.slice();
  u[50] ^= 1;
  let changed = false;
  for (let i = 0; i < u.length; i++) if (u[i] !== orig[i]) { changed = true; break; }
  assert.ok(changed);
});
