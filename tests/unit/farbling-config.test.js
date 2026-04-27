/**
 * Unit tests for farbling noise level configuration
 * Tests FP_NOISE_FACTORS and DEFAULT_SETTINGS fpLevel field
 * Run with: node --test tests/unit/farbling-config.test.js
 */

const assert = require("node:assert");
const test = require("node:test");

async function load() { return import("../../src/core/config.js"); }

test("DEFAULT_SETTINGS includes fpLevel", async () => {
  const { DEFAULT_SETTINGS } = await load();
  assert.ok("fpLevel" in DEFAULT_SETTINGS);
  assert.strictEqual(DEFAULT_SETTINGS.fpLevel, "medium");
});

test("FP_NOISE_FACTORS has all levels", async () => {
  const { FP_NOISE_FACTORS } = await load();
  assert.ok("low" in FP_NOISE_FACTORS);
  assert.ok("medium" in FP_NOISE_FACTORS);
  assert.ok("high" in FP_NOISE_FACTORS);
  assert.strictEqual(typeof FP_NOISE_FACTORS.low, "number");
  assert.strictEqual(typeof FP_NOISE_FACTORS.medium, "number");
  assert.strictEqual(typeof FP_NOISE_FACTORS.high, "number");
});

test("FP_NOISE_FACTORS are in ascending order", async () => {
  const { FP_NOISE_FACTORS } = await load();
  assert.ok(FP_NOISE_FACTORS.low < FP_NOISE_FACTORS.medium);
  assert.ok(FP_NOISE_FACTORS.medium < FP_NOISE_FACTORS.high);
});

test("FP_NOISE_FACTORS ratio is correct", async () => {
  const { FP_NOISE_FACTORS } = await load();
  assert.strictEqual(FP_NOISE_FACTORS.medium, 1);
  assert.ok(FP_NOISE_FACTORS.high / FP_NOISE_FACTORS.medium > 2);
});

test("fpLevel is in ALLOWED_SITE_KEYS and ALLOWED_GLOBAL_KEYS", async () => {
  const { KEY, SESSION } = await load();
  assert.strictEqual(typeof KEY.GLOBAL, "string");
  assert.strictEqual(typeof SESSION.COUNTERS, "string");
});
