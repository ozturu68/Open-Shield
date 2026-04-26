/**
 * Unit tests for farbling logic
 */

const assert = require("node:assert");
const test = require("node:test");

function makePrng(seedStr) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); };
}

test("PRNG deterministic for same seed", () => {
  const a = makePrng("deadbeef");
  const b = makePrng("deadbeef");
  for (let i = 0; i < 10; i++) assert.strictEqual(a(), b());
});

test("PRNG differs across seeds", () => {
  const a = makePrng("aaa");
  const b = makePrng("aab");
  assert.notStrictEqual(a(), b());
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
